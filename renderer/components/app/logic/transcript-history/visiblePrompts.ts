import type { PromptPosition } from "@/components/app/types/transcript-history/history.types";

/** A prompt owns the transcript through the start of the next prompt, including its reply and tools. */
export function visiblePrompts(prompts: readonly PromptPosition[], top: number, height: number, contentHeight: number): string[] {
  if (height <= 0) return [];
  return prompts.filter((prompt, index) => prompt.top < top + height
    && (prompts[index + 1]?.top ?? contentHeight) > top).map((prompt) => prompt.id);
}
