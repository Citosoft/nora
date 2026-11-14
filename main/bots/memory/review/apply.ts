import { editableNote } from "@main/bots/memory/editable";
import type { BotMemoryStore } from "@main/types/bots/memory.types";
import type { MemoryReviewOperation, MemoryReviewOutcome, MemoryReviewTarget } from "@main/types/bots/memoryReview.types";

/**
 * Applies a review's changes through the same checks as the remember and forget tools: only the owner's notes that apply here,
 * never the user's. A change that fails a check, or a note limit that is full, skips that change and keeps the others.
 */
export function applyMemoryReview(memory: BotMemoryStore, target: MemoryReviewTarget, operations: readonly MemoryReviewOperation[]): MemoryReviewOutcome {
  const outcome: MemoryReviewOutcome = { added: 0, updated: 0, forgotten: 0, skipped: 0 };
  for (const operation of operations) {
    try {
      switch (operation.type) {
        case "add":
          memory.add({ botId: target.ownerId, workspaceId: operation.scope === "workspace" ? target.workspaceId : null, text: operation.text,
            source: { kind: "review", conversationId: target.conversationId } });
          outcome.added += 1;
          break;
        case "update":
          editableNote(memory, operation.id, target.ownerId, target.workspaceId);
          memory.update(operation.id, operation.text);
          outcome.updated += 1;
          break;
        case "forget":
          editableNote(memory, operation.id, target.ownerId, target.workspaceId);
          memory.remove(operation.id);
          outcome.forgotten += 1;
          break;
      }
    } catch {
      outcome.skipped += 1;
    }
  }
  return outcome;
}
