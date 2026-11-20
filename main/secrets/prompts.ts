import type { SecretPrompt } from "@shared/types/secrets/secrets.types";
import type { SecretPromptBroker, SecretPromptBrokerOptions, SecretPromptOutcome } from "@main/types/secrets/secrets.types";

/**
 * Holds the prompts a tool call is waiting on. Nothing here is persisted and no prompt carries a value: a prompt is only the
 * question, and it ends when the user answers, the wait lapses or the runtime abandons the call.
 */
export function createSecretPrompts({ nextId, now, timeoutMs, onChanged }: SecretPromptBrokerOptions): SecretPromptBroker {
  const open = new Map<string, { prompt: SecretPrompt; settle(outcome: SecretPromptOutcome): void }>();
  const pending = (): SecretPrompt[] => [...open.values()].map((entry) => entry.prompt);

  return {
    pending,
    get: (id) => open.get(id)?.prompt,
    ask(draft, signal) {
      if (signal.aborted) return Promise.resolve({ kind: "unanswered" });
      return new Promise((resolve) => {
        const prompt: SecretPrompt = { ...draft, id: nextId(), createdAt: now() };
        const lapse = (): void => open.get(prompt.id)?.settle({ kind: "unanswered" });
        const timer = setTimeout(lapse, timeoutMs);
        open.set(prompt.id, { prompt, settle(outcome) {
          clearTimeout(timer);
          signal.removeEventListener("abort", lapse);
          open.delete(prompt.id);
          onChanged(pending());
          resolve(outcome);
        } });
        signal.addEventListener("abort", lapse, { once: true });
        onChanged(pending());
      });
    },
    settle(id, outcome) { open.get(id)?.settle(outcome); }
  };
}
