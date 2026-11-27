import type { IpcMain, IpcMainInvokeEvent } from "electron";
import { ANALYTICS_CHANNELS } from "@shared/analytics/channels";
import type { AnalyticsEvent } from "@shared/types/analytics.types";
import type { FeatureUsageTally } from "@main/types/analytics/analytics.types";

const MAX_SAMPLES = 200;
// The analytics channels describe analytics itself, not product use.
const IGNORED_CHANNELS: ReadonlySet<string> = new Set(Object.values(ANALYTICS_CHANNELS));

function percentile50(samples: readonly number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  return Math.round(sorted[Math.floor(sorted.length / 2)] ?? 0);
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name || "Error" : typeof error;
}

/**
 * Counts how often each IPC action runs and how often it throws. Channels are developer-defined names such as
 * `loops:start-run`, so they describe features without carrying anything the user typed. Counts are sent in aggregate.
 */
export function createFeatureUsage(record: (event: AnalyticsEvent) => void, now: () => number = performance.now.bind(performance)) {
  const tallies = new Map<string, FeatureUsageTally>();
  const tally = (channel: string): FeatureUsageTally => {
    let current = tallies.get(channel);
    if (!current) { current = { count: 0, failures: 0, durations: [] }; tallies.set(channel, current); }
    return current;
  };
  const settle = (channel: string, startedAt: number, error: unknown | null): void => {
    const current = tally(channel);
    current.count += 1;
    if (current.durations.length < MAX_SAMPLES) current.durations.push(now() - startedAt);
    if (error === null) return;
    current.failures += 1;
    record({
      name: "error.occurred",
      properties: {
        source: "ipc", errorName: errorName(error), errorCode: null, context: channel,
        ...(error instanceof Error ? { message: error.message, ...(error.stack ? { stack: error.stack } : {}) } : {})
      }
    });
  };

  return {
    /**
     * Wraps `ipcMain.handle` so every handler registered afterwards is counted. Call once, before any IPC module
     * registers, so no channel is missed and none is wrapped twice.
     */
    instrument(ipc: IpcMain): void {
      const handle = ipc.handle.bind(ipc);
      ipc.handle = (channel, listener) => handle(channel, IGNORED_CHANNELS.has(channel) ? listener : async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
        const startedAt = now();
        try {
          const result: unknown = await listener(event, ...args);
          settle(channel, startedAt, null);
          return result;
        } catch (error) {
          settle(channel, startedAt, error);
          throw error;
        }
      });
    },
    /** Sends one `feature.used` per channel used since the last report and starts counting afresh. */
    report(): void {
      for (const [channel, current] of tallies) {
        const separator = channel.indexOf(":");
        record({
          name: "feature.used",
          properties: {
            feature: separator > 0 ? channel.slice(0, separator) : channel,
            action: channel,
            count: current.count,
            failures: current.failures,
            p50DurationMs: percentile50(current.durations),
            maxDurationMs: Math.round(Math.max(0, ...current.durations))
          }
        });
      }
      tallies.clear();
    }
  };
}
