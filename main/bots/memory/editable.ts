import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { BotMemoryStore } from "@main/types/bots/memory.types";

/**
 * A note an owner's thread (or its background review) may change: the owner's, applying in this workspace, and not written
 * by the user, whose notes stay exactly as they wrote them. Throws a message the model can act on.
 */
export function editableNote(memory: Pick<BotMemoryStore, "get">, memoryId: string, ownerId: string, workspaceId: string): BotMemoryEntry {
  const note = memory.get(memoryId);
  if (!note || note.botId !== ownerId || (note.workspaceId !== null && note.workspaceId !== workspaceId)) {
    throw new Error(`No note with id "${memoryId}". Call recall for the ids.`);
  }
  if (note.source.kind === "user") throw new Error("The user wrote that note, so only they can change it. Save a new note instead.");
  return note;
}
