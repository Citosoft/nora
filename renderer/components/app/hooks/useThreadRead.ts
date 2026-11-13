import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ThreadReadState } from "@/components/app/types/threadForge.types";

/**
 * Loads `read` whenever `identity` or `revision` changes. A revision-only reload keeps the last
 * value on screen so background refreshes do not flicker; a new identity starts from loading.
 */
export function useThreadRead<T>(read: (() => Promise<T>) | null, identity: string, revision: string, failureMessage: string): ThreadReadState<T> {
  const [state, setState] = useState<ThreadReadState<T>>({ status: "unavailable" });
  const readRef = useRef(read);
  const loadedIdentity = useRef<string | null>(null);
  useLayoutEffect(() => { readRef.current = read; });
  useEffect(() => {
    const current = readRef.current;
    if (!current) {
      loadedIdentity.current = null;
      setState({ status: "unavailable" });
      return;
    }
    const sameTarget = loadedIdentity.current === identity;
    loadedIdentity.current = identity;
    let cancelled = false;
    setState((previous) => sameTarget && previous.status === "ready" ? previous : { status: "loading" });
    current().then((value) => {
      if (!cancelled) setState({ status: "ready", value });
    }, (cause: unknown) => {
      if (!cancelled) setState({ status: "failed", message: cause instanceof Error ? cause.message : failureMessage });
    });
    return () => { cancelled = true; };
  }, [identity, revision, failureMessage]);
  return state;
}
