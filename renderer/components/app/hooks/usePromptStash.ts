import { useMemo, useSyncExternalStore } from "react";
import { promptStash, removeStashedPrompt, takeStashedPrompt, togglePromptStash } from "@/components/app/logic/composer-prompts/promptStash";
import type { PromptStash, PromptStashSwap } from "@/components/app/types/composerPrompts.types";

/** Prompts set aside for later; one stash for every composer, kept across launches. */
export function usePromptStash(): PromptStash {
  const entries = useSyncExternalStore(promptStash.subscribe, promptStash.read);
  return useMemo(() => {
    const apply = (swap: PromptStashSwap | null): string | null => {
      if (!swap) return null;
      promptStash.write(swap.stash);
      return swap.text;
    };
    const now = (): string => new Date().toISOString();
    const createId = (): string => crypto.randomUUID();
    return {
      entries,
      toggle: (current) => apply(togglePromptStash(promptStash.read(), current, now(), createId)),
      restore: (id, current) => apply(takeStashedPrompt(promptStash.read(), id, current, now(), createId)),
      remove: (id) => promptStash.write(removeStashedPrompt(promptStash.read(), id))
    };
  }, [entries]);
}
