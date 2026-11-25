import type { StoreTransaction } from "@main/types/execution/store.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";

/** Turns per conversation whose snapshots are kept for undo; older turns keep their diffs but can no longer be undone. */
export const retainedTurnCheckpoints = 20;

/** The review item for a turn, when it holds that turn's own changes and undo could still have been offered. */
function undoableReview(transaction: StoreTransaction, conversationId: string, attemptId: string): Extract<TimelineItem, { kind: "review" }> | null {
  const item = transaction.item(conversationId, JSON.stringify([attemptId, "review"]));
  if (item?.kind !== "review" || item.result.status !== "ready" || item.result.scope !== "turn" || !item.result.changes.length) return null;
  return item.undo?.status === "undone" || item.undo?.status === "expired" ? null : item;
}

/** Drops snapshots beyond the newest retained turns, skipping any still needed by unfinished review or undo work. */
export function pruneCheckpoints(transaction: StoreTransaction, conversationId: string, at: string, nextId: () => string): void {
  for (const run of transaction.checkpointRuns(conversationId).slice(retainedTurnCheckpoints)) {
    if (run.active) continue;
    transaction.deleteCheckpoint(conversationId, run.runId);
    const review = undoableReview(transaction, conversationId, run.attemptId);
    if (!review) continue;
    const event = transaction.appendEvent(nextId(), conversationId, at, { kind: "item", item: { ...review, undo: { status: "expired", at } } });
    transaction.project(event);
  }
}
