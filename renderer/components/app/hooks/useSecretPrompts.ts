import { useCallback, useEffect, useMemo, useState } from "react";
import { secretClient } from "@/components/app/clients/secretClient";
import type { SecretBridge } from "@shared/ipc/types/secretGateway.types";
import type { SecretPrompt } from "@shared/types/secrets/secrets.types";
import type { AnswerSecretPrompt, SecretPromptsState } from "@/components/app/types/secretPrompts.types";

const NONE: readonly SecretPrompt[] = [];

/**
 * The secret prompts a thread may answer: its own and those of bots it asked, which run in threads the user is not looking at.
 * Replies and change notifications both carry every waiting prompt, so whichever arrives last is the truth.
 */
export function useSecretPrompts(conversationId: string | null, client: SecretBridge = secretClient): SecretPromptsState {
  const [prompts, setPrompts] = useState<readonly SecretPrompt[]>(NONE);

  useEffect(() => {
    let active = true;
    const unsubscribe = client.onPromptsChanged((next) => { if (active) setPrompts(next); });
    client.request({ kind: "pending" }).then((next) => { if (active) setPrompts(next); },
      (error: unknown) => { console.error("Secret requests could not be loaded", error); });
    return () => { active = false; unsubscribe(); };
  }, [client]);

  const answer = useCallback<AnswerSecretPrompt>(async (input) => { setPrompts(await client.request(input)); }, [client]);
  const own = useMemo(() => conversationId ? prompts.filter((prompt) => prompt.conversationIds.includes(conversationId)) : NONE, [conversationId, prompts]);
  return useMemo(() => ({ prompts: own, answer }), [own, answer]);
}
