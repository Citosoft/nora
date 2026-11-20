import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { IdleThreadStore } from "@main/types/execution/idleThread.types";

/** Old or interrupted create-then-submit flows may leave a worker with no instruction at all. */
export const WORKER_STARTUP_GRACE_MS = 2 * 60_000;

export function expiredWorkerStartup(store: IdleThreadStore, conversation: Conversation, now: string): boolean {
  if (conversation.source?.kind !== "worker" || conversation.archivedAt || conversation.queuePaused) return false;
  const lastInteraction = Math.max(Date.parse(conversation.createdAt), Date.parse(conversation.updatedAt), Date.parse(conversation.reopenedAt ?? conversation.createdAt));
  const elapsed = Date.parse(now) - lastInteraction;
  if (!Number.isFinite(elapsed) || elapsed < WORKER_STARTUP_GRACE_MS) return false;
  const header = store.header(conversation.id);
  if (!header || header.activeRuns.length || header.queuedRuns.length || header.pendingRequests.length || store.hasBackgroundActivity(conversation.id)) return false;
  const page = store.history({ conversationId: conversation.id, scope: "runs", limit: 1 });
  return page.scope === "runs" && page.runs.length === 0;
}
