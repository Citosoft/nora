import type { StoreTransaction, ExecutionEffect } from "@main/types/execution/store.types";
import type { TurnUndoState } from "@shared/types/conversation/turnUndo.types";

/** Records the undo outcome on the turn's review item and retires the effect in one transaction. */
export function finalizeUndo(transaction: StoreTransaction, effect: ExecutionEffect, result: TurnUndoState, at: string, nextId: () => string): void {
  const item = transaction.item(effect.conversationId, JSON.stringify([effect.attemptId, "review"]));
  if (item?.kind === "review") {
    const event = transaction.appendEvent(nextId(), effect.conversationId, at, { kind: "item", item: { ...item, undo: result } });
    transaction.project(event);
  }
  transaction.putEffect({ ...effect, status: "done" });
}
