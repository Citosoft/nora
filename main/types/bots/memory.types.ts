import type { BotMemoryEntry } from "@shared/types/bots/bots.types";

/** The notes delivered with a run, newest first, and how many applicable notes did not fit (reachable through recall). */
export interface BotMemoryDigest { notes: readonly BotMemoryEntry[]; omitted: number; }
/** What a run gets from its owner's notes: system guidance that stays fixed for the thread, and changes since then for this turn. */
export interface MemoryDeliveryForRun { guidance: string | null; turnNotes: string | null; }
export interface MemoryDelivery {
  /** Freezes the notes on a thread's first run (in this app session) and describes later changes; call once per run. */
  forRun(conversationId: string, digest: BotMemoryDigest | null): MemoryDeliveryForRun;
}
export interface NewBotMemory { botId: string; workspaceId: string | null; text: string; source: BotMemoryEntry["source"]; }
/** Durable, user-visible notes each bot keeps; never instructions and never written to a repository. */
export interface BotMemoryStore {
  /** Notes that apply in a workspace: its own plus the bot's everywhere notes, newest first. A null workspace lists every note. */
  list(botId: string, workspaceId: string | null): BotMemoryEntry[];
  get(id: string): BotMemoryEntry | null;
  /** Saves a note; an identical note for the same bot and scope is returned instead of a duplicate. */
  add(input: NewBotMemory): BotMemoryEntry;
  update(id: string, text: string): BotMemoryEntry;
  remove(id: string): void;
  /** Full-text search over the applicable notes, best match first; an empty query lists the newest. */
  search(botId: string, workspaceId: string | null, query: string, limit: number): BotMemoryEntry[];
  /** The most recently saved or edited applicable notes that fit the budget, formatted for run guidance; null when there are none. */
  digest(botId: string, workspaceId: string, maxChars: number): BotMemoryDigest | null;
  /** The time of the last message a background review read in a thread, so the next review reads only what is newer. */
  reviewedThrough(conversationId: string): string | null;
  markReviewed(conversationId: string, through: string): void;
  close(): void;
}
