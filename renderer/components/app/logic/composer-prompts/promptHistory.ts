import { createStoredList } from "./storedList";
import type { PromptRecall, PromptRecallInput, PromptRecallStep } from "@/components/app/types/composerPrompts.types";

export const PROMPT_HISTORY_LIMIT = 100;
export const IDLE_PROMPT_RECALL: PromptRecall = { index: -1, draft: "" };

const history = createStoredList<string>({
  key: "nora-composer-prompt-history-v1",
  limit: PROMPT_HISTORY_LIMIT,
  parse: (entry) => typeof entry === "string" && entry.trim() ? entry : null
});

/** Puts a sent prompt at the front; resending an older prompt moves it there instead of repeating it. */
export function appendPromptHistory(entries: readonly string[], text: string, limit = PROMPT_HISTORY_LIMIT): readonly string[] {
  if (!text.trim()) return entries;
  return [text, ...entries.filter((entry) => entry !== text)].slice(0, limit);
}

export function readPromptHistory(): readonly string[] {
  return history.read();
}

export function rememberPrompt(text: string): void {
  const next = appendPromptHistory(history.read(), text);
  if (next !== history.read()) history.write(next);
}

/**
 * Up recalls older prompts when the composer is empty, the caret is at its very start, or it still shows an unedited
 * recalled prompt; otherwise the arrows keep moving the caret. Down walks back towards, and finally restores, your own draft.
 * Returns null when the key should keep its native behaviour.
 */
export function stepPromptRecall({ history: entries, recall, text, caret, direction }: PromptRecallInput): PromptRecallStep | null {
  // Editing a recalled prompt makes it your draft, so browsing restarts from the newest entry.
  const browsing = recall.index >= 0 && entries[recall.index] === text;
  if (direction === "older" && !browsing && text !== "" && caret !== 0) return null;
  if (direction === "newer" && !browsing) return null;
  const start = browsing ? recall : { index: -1, draft: text };
  const index = start.index + (direction === "older" ? 1 : -1);
  if (index >= entries.length) return null;
  if (index < 0) return { recall: IDLE_PROMPT_RECALL, text: start.draft };
  return { recall: { index, draft: start.draft }, text: entries[index] };
}
