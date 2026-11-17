import type { BotMemoryEntry } from "@shared/types/bots/bots.types";

/** One note as every model sees it, with the id that remember and forget take. */
export function noteLine(note: Pick<BotMemoryEntry, "id" | "text">): string {
  return `- [${note.id}] ${note.text}`;
}
