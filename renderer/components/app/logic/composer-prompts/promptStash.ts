import { createStoredList } from "./storedList";
import type { PromptStashSwap, StashedPrompt } from "@/components/app/types/composerPrompts.types";

export const PROMPT_STASH_LIMIT = 50;

function parseStashedPrompt(entry: unknown): StashedPrompt | null {
  if (typeof entry !== "object" || entry === null) return null;
  const id: unknown = Reflect.get(entry, "id");
  const text: unknown = Reflect.get(entry, "text");
  const stashedAt: unknown = Reflect.get(entry, "stashedAt");
  return typeof id === "string" && typeof text === "string" && text.trim() && typeof stashedAt === "string" ? { id, text, stashedAt } : null;
}

export const promptStash = createStoredList<StashedPrompt>({ key: "nora-composer-prompt-stash-v1", limit: PROMPT_STASH_LIMIT, parse: parseStashedPrompt });

/** Adds `text` as the newest stash entry; blank drafts are not stashed. */
export function pushStashedPrompt(stash: readonly StashedPrompt[], text: string, now: string, createId: () => string): readonly StashedPrompt[] {
  if (!text.trim()) return stash;
  return [{ id: createId(), text, stashedAt: now }, ...stash].slice(0, PROMPT_STASH_LIMIT);
}

/** Takes an entry back into the composer; a draft already there is stashed in its place so nothing is lost. */
export function takeStashedPrompt(stash: readonly StashedPrompt[], id: string, current: string, now: string, createId: () => string): PromptStashSwap | null {
  const entry = stash.find((candidate) => candidate.id === id);
  if (!entry) return null;
  return { stash: pushStashedPrompt(stash.filter((candidate) => candidate.id !== id), current, now, createId), text: entry.text };
}

/** The stash shortcut's toggle: stash a draft, or bring back the newest entry when the composer is empty. */
export function togglePromptStash(stash: readonly StashedPrompt[], current: string, now: string, createId: () => string): PromptStashSwap | null {
  if (current.trim()) return { stash: pushStashedPrompt(stash, current, now, createId), text: "" };
  return stash[0] ? takeStashedPrompt(stash, stash[0].id, current, now, createId) : null;
}

export function removeStashedPrompt(stash: readonly StashedPrompt[], id: string): readonly StashedPrompt[] {
  return stash.filter((entry) => entry.id !== id);
}
