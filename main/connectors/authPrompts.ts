import type { ConnectorAuthPrompt } from "@shared/types/connectors/authPrompt.types";
import type { ConnectorAuthPromptBroker, ConnectorAuthPromptBrokerOptions, ConnectorAuthPromptOutcome } from "@main/types/connectors/authPrompt.types";

/**
 * Holds connector OAuth prompts a gateway tool call is waiting on. Nothing is persisted; a prompt ends when the user
 * authorizes, declines, the wait lapses, or the runtime abandons the call.
 */
export function createConnectorAuthPrompts({ nextId, now, timeoutMs, onChanged }: ConnectorAuthPromptBrokerOptions): ConnectorAuthPromptBroker {
  const open = new Map<string, { prompt: ConnectorAuthPrompt; waiters: Array<(outcome: ConnectorAuthPromptOutcome) => void>; settle(outcome: ConnectorAuthPromptOutcome): void }>();
  const pending = (): ConnectorAuthPrompt[] => [...open.values()].map((entry) => entry.prompt);

  return {
    pending,
    get: (id) => open.get(id)?.prompt,
    ask(draft, signal) {
      if (signal.aborted) return Promise.resolve({ kind: "unanswered" });
      for (const entry of open.values()) {
        if (entry.prompt.connectorId !== draft.connectorId) continue;
        return new Promise((resolve) => {
          if (signal.aborted) { resolve({ kind: "unanswered" }); return; }
          const onAbort = (): void => resolve({ kind: "unanswered" });
          signal.addEventListener("abort", onAbort, { once: true });
          entry.waiters.push((outcome) => { signal.removeEventListener("abort", onAbort); resolve(outcome); });
        });
      }
      return new Promise((resolve) => {
        const prompt: ConnectorAuthPrompt = {
          id: nextId(),
          conversationIds: [...draft.conversationIds],
          connectorId: draft.connectorId,
          connectorName: draft.connectorName,
          serverName: draft.serverName,
          createdAt: now(),
          ...(draft.logo ? { logo: draft.logo } : {}),
          ...(draft.message ? { message: draft.message } : {})
        };
        const waiters: Array<(outcome: ConnectorAuthPromptOutcome) => void> = [resolve];
        const lapse = (): void => open.get(prompt.id)?.settle({ kind: "unanswered" });
        const timer = setTimeout(lapse, timeoutMs);
        const entry = {
          prompt,
          waiters,
          settle(outcome: ConnectorAuthPromptOutcome) {
            clearTimeout(timer);
            signal.removeEventListener("abort", lapse);
            open.delete(prompt.id);
            onChanged(pending());
            for (const waiter of waiters) waiter(outcome);
          }
        };
        open.set(prompt.id, entry);
        signal.addEventListener("abort", lapse, { once: true });
        onChanged(pending());
      });
    },
    signedIn(connectorId) {
      for (const entry of [...open.values()]) {
        if (entry.prompt.connectorId === connectorId) entry.settle({ kind: "signed-in" });
      }
    },
    settle(id, outcome) { open.get(id)?.settle(outcome); }
  };
}
