import type { HistoryEntry, HistoryPrompt } from "@/components/app/types/transcript-history/history.types";

/** Keep the last assistant message in each prompt's turn, including an in-progress reply. */
export function buildHistoryPrompts(entries: readonly HistoryEntry[]): HistoryPrompt[] {
  const prompts: HistoryPrompt[] = [];
  for (const entry of entries) {
    if (entry.kind === "prompt") prompts.push({ ...entry.prompt, output: null });
    else {
      const prompt = prompts.at(-1);
      if (prompt && entry.text.trim()) prompt.output = entry.text;
    }
  }
  return prompts;
}
