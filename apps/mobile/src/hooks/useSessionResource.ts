import { useCallback, useEffect, useRef, useState } from "react";
import type { LoadState, SessionResource } from "@/types/loadState.types";
import type { RuntimeClient } from "@/types/runtimeClient.types";
import type { RuntimeSession, SessionResourceOptions } from "@/types/runtimeSession.types";
import { errorMessage } from "@/api/http/remoteRequestError";
import { subscribeToForeground } from "@/platform/foregroundSignals";

/**
 * A runtime-backed list kept fresh: loads on mount, reloads (debounced) on relevant realtime events, after a resync reset
 * and when the app returns to the foreground. A failed refresh keeps showing the last good value.
 */
export function useSessionResource<T>(session: RuntimeSession | null, load: (client: RuntimeClient) => Promise<T>,
  options: SessionResourceOptions): SessionResource<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const loadRef = useRef(load);
  loadRef.current = load;
  const generation = useRef(0);
  const isAffectedBy = useRef(options.isAffectedBy);
  isAffectedBy.current = options.isAffectedBy;
  const debounceMs = options.debounceMs ?? 500;

  const refresh = useCallback(() => {
    if (!session) return;
    const current = ++generation.current;
    setState((previous) => previous.status === "ready" ? { ...previous, refreshing: true } : previous);
    loadRef.current(session.client).then((value) => {
      if (current === generation.current) setState({ status: "ready", value, refreshing: false });
    }, (error: unknown) => {
      if (current !== generation.current) return;
      setState((previous) => ({ status: "error", message: errorMessage(error),
        stale: previous.status === "ready" ? previous.value : previous.status === "error" ? previous.stale : null }));
    });
  }, [session]);

  useEffect(() => {
    setState({ status: "loading" });
    refresh();
  }, [refresh, options.key]);

  useEffect(() => {
    if (!session) return undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (): void => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, debounceMs);
    };
    const offEvents = session.onEvents((events) => {
      if (isAffectedBy.current(events)) schedule();
    });
    const offReset = session.onReset(async () => refresh());
    const offForeground = subscribeToForeground(refresh);
    return () => {
      if (timer) clearTimeout(timer);
      offEvents();
      offReset();
      offForeground();
    };
  }, [debounceMs, refresh, session]);

  return { state, refresh };
}
