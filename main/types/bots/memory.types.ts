import type { BotMemoryEntry } from "@shared/types/bots/bots.types";

export interface NewBotMemory { botId: string; workspaceId: string | null; text: string; source: BotMemoryEntry["source"]; }
/** Durable, user-visible notes each bot keeps; never instructions and never written to a repository. */
export interface BotMemoryStore {
  /** Notes that apply in a workspace: its own plus the bot's everywhere notes, newest first. A null workspace lists every note. */
  list(botId: string, workspaceId: string | null): BotMemoryEntry[];
  add(input: NewBotMemory): BotMemoryEntry;
  update(id: string, text: string): BotMemoryEntry;
  remove(id: string): void;
  search(botId: string, workspaceId: string | null, query: string, limit: number): BotMemoryEntry[];
  /** The newest applicable notes that fit the budget, formatted for a bot's run guidance; null when there are none. */
  digest(botId: string, workspaceId: string, maxChars: number): string | null;
  close(): void;
}
