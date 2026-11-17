import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { IdleThreadStore } from "@main/types/execution/idleThread.types";
import { hasPendingCheckpointReview } from "./checkpoints/admission";

/** A shared eligibility boundary for background thread maintenance; never consume pending user or agent work. */
export function idleThreadRun(store: IdleThreadStore, conversation: Conversation) {
  if (conversation.archivedAt || conversation.queuePaused) return null;
  const header = store.header(conversation.id);
  if (!header || header.activeRuns.length || header.queuedRuns.length || header.pendingRequests.length) return null;
  const page = store.history({ conversationId: conversation.id, scope: "runs", limit: 1 });
  const last = page.scope === "runs" ? page.runs[0] : undefined;
  if (!last || last.state !== "completed" || last.review === "pending" || store.hasBackgroundActivity(conversation.id)) return null;
  if (hasPendingCheckpointReview(store, conversation.workspace) || store.writers(conversation.workspace).some((id) => id !== conversation.id)) return null;
  return last;
}
