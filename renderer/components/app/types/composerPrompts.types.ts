/** A persisted, newest-first list shared by every composer in the window and kept across launches. */
export interface StoredList<T> {
  read(): readonly T[];
  write(next: readonly T[]): void;
  subscribe(listener: () => void): () => void;
}
export interface StoredListOptions<T> {
  key: string;
  limit: number;
  /** Narrows one untyped stored entry; entries that fail are dropped rather than failing the list. */
  parse(entry: unknown): T | null;
}

/** Where Up/Down prompt recall stands: `index` is -1 while editing your own draft, otherwise the shown history entry (0 = newest). */
export interface PromptRecall { index: number; draft: string; }
export type PromptRecallDirection = "older" | "newer";
export interface PromptRecallInput {
  history: readonly string[];
  recall: PromptRecall;
  text: string;
  caret: number;
  direction: PromptRecallDirection;
}
export interface PromptRecallStep { recall: PromptRecall; text: string; }

export interface StashedPrompt { id: string; text: string; stashedAt: string; }
export interface PromptStashSwap { stash: readonly StashedPrompt[]; text: string; }
export interface PromptStash {
  entries: readonly StashedPrompt[];
  /** The shortcut's toggle: stashes a draft or restores the newest entry. Returns the composer's next text, or null when nothing changes. */
  toggle(current: string): string | null;
  restore(id: string, current: string): string | null;
  remove(id: string): void;
}
export interface ComposerStashKeyInput { key: string; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean; }
export interface ComposerStashMenuProps {
  entries: readonly StashedPrompt[];
  disabled: boolean;
  shortcut: string;
  onRestore(id: string): void;
  onRemove(id: string): void;
}
