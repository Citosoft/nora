import { useCallback, useRef, useState } from "react";
import type { AnswerSecretPrompt, SecretAnswerState } from "@/components/app/types/secretPrompts.types";

/** Delivers one answer at a time for a secret prompt card and keeps a failure on screen so it can be retried. */
export function useSecretAnswer(onAnswer: AnswerSecretPrompt): SecretAnswerState {
  const [sending, setSending] = useState<SecretAnswerState["sending"]>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const send = useCallback<SecretAnswerState["send"]>(async (answer) => {
    if (inFlight.current) return false;
    inFlight.current = true; setSending(answer.kind); setError(null);
    try { await onAnswer(answer); return true; }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : "That did not work. Try again."); return false; }
    finally { inFlight.current = false; setSending(null); }
  }, [onAnswer]);
  return { sending, error, send };
}
