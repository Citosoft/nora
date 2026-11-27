import type { AnalyticsTransport, AnalyticsTransportOptions, QueuedAnalyticsEvent } from "@main/types/analytics/analytics.types";

/**
 * PostHog's EU cloud (Frankfurt). Pinned rather than configurable because the privacy policy promises analytics is stored
 * in the EU; a build-time override could silently move it elsewhere.
 */
export const POSTHOG_BATCH_ENDPOINT = "https://eu.i.posthog.com/batch/";

/**
 * Queues events in memory and sends them to PostHog in batches. Nothing is written to disk, so events that cannot be sent
 * before quit are dropped rather than kept on the user's machine. The queue is capped; the oldest events go first.
 */
export function createPostHogTransport(options: AnalyticsTransportOptions): AnalyticsTransport {
  const send = options.fetch ?? globalThis.fetch;
  const maxQueued = options.maxQueued ?? 1_000;
  const maxBatch = options.maxBatch ?? 100;
  let queue: QueuedAnalyticsEvent[] = [];
  let inFlight: Promise<boolean> | null = null;

  const sendBatch = async (batch: QueuedAnalyticsEvent[]): Promise<boolean> => {
    try {
      const response = await send(POSTHOG_BATCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: options.config.apiKey, batch }),
        signal: AbortSignal.timeout(10_000),
        redirect: "error"
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const drain = async (): Promise<boolean> => {
    while (queue.length > 0) {
      const batch = queue.slice(0, maxBatch);
      if (!(await sendBatch(batch))) return false;
      // Only drop what was sent; a clear() during the request already emptied the queue.
      const sent = new Set(batch.map((event) => event.uuid));
      queue = queue.filter((event) => !sent.has(event.uuid));
    }
    return true;
  };

  return {
    enqueue(event) {
      queue.push(event);
      if (queue.length > maxQueued) queue = queue.slice(queue.length - maxQueued);
    },
    clear() { queue = []; },
    pending() { return queue.length; },
    flush() {
      inFlight ??= drain().finally(() => { inFlight = null; });
      return inFlight;
    }
  };
}
