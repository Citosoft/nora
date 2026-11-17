import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import type { ConversationHandle } from "@/types/conversationHook.types";
import type { LoadState } from "@/types/loadState.types";
import type { RuntimeSession } from "@/types/runtimeSession.types";
import { errorMessage } from "@/api/http/remoteRequestError";
import { subscribeToForeground } from "@/platform/foregroundSignals";
import { applyEvents, prependOlder, viewFromDetail } from "@/state/conversationViewState";

const pollIntervalMs = 5_000;

/**
 * One conversation's live view: the HTTP snapshot plus realtime events through the shared reducer. Events that arrive
 * while the snapshot loads are buffered and applied after it (the reducer skips those already included).
 */
export function useConversation(session: RuntimeSession | null, conversationId: string, liveUpdates: boolean): ConversationHandle {
  const [state, setState] = useState<LoadState<ConversationView>>({ status: "loading" });
  const [olderHistory, setOlderHistory] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const pending = useRef<ConversationEvent[]>([]);
  const loaded = useRef(false);
  const generation = useRef(0);

  const refresh = useCallback(() => {
    if (!session) return;
    const current = ++generation.current;
    session.client.conversation(conversationId).then((detail) => {
      if (current !== generation.current) return;
      const view = applyEvents(viewFromDetail(detail), pending.current);
      pending.current = [];
      loaded.current = true;
      setState({ status: "ready", value: view, refreshing: false });
    }, (error: unknown) => {
      if (current !== generation.current) return;
      setState((previous) => ({ status: "error", message: errorMessage(error),
        stale: previous.status === "ready" ? previous.value : previous.status === "error" ? previous.stale : null }));
    });
  }, [conversationId, session]);

  useEffect(() => {
    loaded.current = false;
    pending.current = [];
    setState({ status: "loading" });
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!session) return undefined;
    const offEvents = session.onEvents((events) => {
      const relevant = events.filter((event) => event.conversationId === conversationId);
      if (!relevant.length) return;
      if (!loaded.current) {
        pending.current.push(...relevant);
        return;
      }
      setState((previous) => previous.status === "ready" ? { ...previous, value: applyEvents(previous.value, relevant) } : previous);
    });
    const offReset = session.onReset(async () => refresh());
    const offForeground = subscribeToForeground(refresh);
    return () => {
      offEvents();
      offReset();
      offForeground();
    };
  }, [conversationId, refresh, session]);

  // Without live updates, poll while the agent is working so progress still appears.
  const working = state.status === "ready" && (state.value.header.activeRuns.length > 0 || state.value.header.queuedRuns.length > 0);
  useEffect(() => {
    if (liveUpdates || !working) return undefined;
    const handle = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(handle);
  }, [liveUpdates, refresh, working]);

  const nextBefore = state.status === "ready" ? state.value.nextBefore : null;
  const loadOlder = useCallback(() => {
    if (!session || nextBefore === null || olderHistory.loading) return;
    setOlderHistory({ loading: true, error: null });
    session.client.timeline(conversationId, { before: nextBefore }).then((page) => {
      setState((previous) => previous.status === "ready" ? { ...previous, value: prependOlder(previous.value, page) } : previous);
      setOlderHistory({ loading: false, error: null });
    }, (error: unknown) => setOlderHistory({ loading: false, error: errorMessage(error) }));
  }, [conversationId, nextBefore, olderHistory.loading, session]);

  return { state, olderHistory, loadOlder, refresh };
}
