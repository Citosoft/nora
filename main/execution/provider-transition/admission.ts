import type { StoreReader } from "@main/types/execution/store.types";
import { ExecutionCommandError } from "../errors";

/** Check again inside the command transaction after asynchronous snapshot preparation. */
export function assertTransitionIdle(store: StoreReader, conversationId: string): void {
  const header = store.header(conversationId);
  if (!header) throw new ExecutionCommandError("missing", "Conversation does not exist");
  if (header.conversation.archivedAt || header.activeRuns.length || header.queuedRuns.length || header.pendingRequests.length
    || store.hasBackgroundActivity(conversationId)
    || store.unfinishedEffects().some((effect) => effect.conversationId === conversationId)) {
    throw new ExecutionCommandError("conflict", "Finish active work, approvals and reviews, and clear queued instructions before changing providers.");
  }
}
