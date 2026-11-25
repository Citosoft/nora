import { useCallback, useEffect, useMemo, useState } from "react";
import { connectorClient } from "@/components/app/clients/connectorClient";
import type { ConnectorAuthPromptBridge } from "@shared/ipc/types/connectorAuthPromptGateway.types";
import type { ConnectorAuthPrompt } from "@shared/types/connectors/authPrompt.types";
import type { AnswerConnectorAuthPrompt, ConnectorAuthPromptsState } from "@/components/app/types/connectorAuthPrompts.types";

const NONE: readonly ConnectorAuthPrompt[] = [];

/**
 * Authorize prompts a thread may answer: its own and those of bots it asked, which run in threads the user is not looking at.
 * Replies and change notifications both carry every waiting prompt, so whichever arrives last is the truth.
 */
export function useConnectorAuthPrompts(conversationId: string | null, client: ConnectorAuthPromptBridge = connectorClient.authPrompts): ConnectorAuthPromptsState {
  const [prompts, setPrompts] = useState<readonly ConnectorAuthPrompt[]>(NONE);

  useEffect(() => {
    let active = true;
    const unsubscribe = client.onChanged((next) => { if (active) setPrompts(next); });
    client.request({ kind: "pending" }).then((next) => { if (active) setPrompts(next); },
      (error: unknown) => { console.error("Connector sign-in requests could not be loaded", error); });
    return () => { active = false; unsubscribe(); };
  }, [client]);

  const answer = useCallback<AnswerConnectorAuthPrompt>(async (input) => { setPrompts(await client.request(input)); }, [client]);
  const own = useMemo(() => conversationId ? prompts.filter((prompt) => prompt.conversationIds.includes(conversationId)) : NONE, [conversationId, prompts]);
  return useMemo(() => ({ prompts: own, answer }), [own, answer]);
}
