import { useCallback, useEffect, useState } from "react";
import { directContextClient } from "@/components/app/clients/directContextClient";
import type { DirectContextQuery, DirectContextState } from "@/components/app/types/chatContext.types";

/** Typing should not query main on every keystroke; the preview is a developer aid, not live-critical. */
const DEBOUNCE_MS = 250;

/**
 * Reads what a direct chat's next message would send while `query` is set, re-reading as the draft, target or chat changes.
 * Callers keep `target` referentially stable (state, not a fresh object per render) so it only refetches on a real change.
 */
export function useDirectContextPreview(query: DirectContextQuery | null): { state: DirectContextState; refresh(): void } {
  const [state, setState] = useState<DirectContextState>({ status: "loading", preview: null });
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((value) => value + 1), []);
  const chatId = query?.chatId ?? null;
  const draft = query?.draft ?? "";
  const target = query?.target ?? null;
  const revision = query?.revision ?? "";
  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    setState((previous) => ({ status: "loading", preview: previous.preview }));
    const timer = setTimeout(() => {
      directContextClient.preview({ chatId, draft, target })
        .then((preview) => { if (!cancelled) setState({ status: "ready", preview }); })
        .catch((error: unknown) => { if (!cancelled) setState((previous) => ({ status: "failed", preview: previous.preview,
          message: error instanceof Error ? error.message : "The context could not be previewed." })); });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [chatId, draft, target, revision, nonce]);
  return { state, refresh };
}
