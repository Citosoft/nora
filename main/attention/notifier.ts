import { describeAttention } from "@shared/conversations/attention";
import type { AttentionNotifierDeps } from "@main/types/attention.types";

export function pendingRequestCount(deps: Pick<AttentionNotifierDeps["host"], "summaries">): number {
  return deps.summaries().reduce((total, { conversation, pendingRequestCount: count }) => total + (conversation.archivedAt ? 0 : count), 0);
}

/**
 * Watches every native thread, including bots' child threads and group members, for approvals and questions. Each request notifies at most once,
 * and the badge always reflects what is still waiting.
 */
export function startAttentionNotifier(deps: AttentionNotifierDeps): () => void {
  const notified = new Set<string>();
  deps.setBadge(pendingRequestCount(deps.host));
  return deps.host.subscribe({ after: deps.host.eventCursor(), onError: (error) => console.error("Attention notifications stopped", error),
    onEvent(event) {
      if (event.payload.kind !== "request" && event.payload.kind !== "conversation") return;
      deps.setBadge(pendingRequestCount(deps.host));
      if (event.payload.kind !== "request") return;
      const request = event.payload.request;
      if (request.status !== "pending" || notified.has(request.id)) return;
      notified.add(request.id);
      const conversation = deps.host.header(event.conversationId)?.conversation;
      if (!conversation || !deps.shouldNotify()) return;
      const parent = conversation.parentId ? deps.host.header(conversation.parentId)?.conversation ?? null : null;
      deps.notify(describeAttention(conversation, parent, request));
    } });
}
