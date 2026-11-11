import { useCallback, useEffect, useState } from "react";
import type { NativeConversationDeps, NativeConversationView } from "@/components/app/types/nativeConversation.types";
import { applyNativeEvent, mergeTimeline } from "@/components/app/logic/nativeConversationState";
import { loadNativeRunHistory, mergeRunHistory } from "@/components/app/logic/nativeRunHistory";

export function useNativeConversation({ client, conversationId }: NativeConversationDeps) {
  const [view, setView] = useState<NativeConversationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let disposed = false;
    let stop = (): void => {};
    setView(null); setError(null);
    if (conversationId) void (async () => {
      const [header, history] = await Promise.all([client.header(conversationId), client.history({ conversationId, scope: "timeline", limit: 100 })]);
      if (!header) throw new Error("Conversation was not found on its execution host");
      if (history.scope !== "timeline") throw new Error("Incompatible conversation history");
      const runHistory = await loadNativeRunHistory(client, conversationId, history.items);
      if (disposed) return;
      setView({ header, items: history.items, nextBefore: history.nextBefore, runHistory });
      stop = client.subscribe({ conversationId, after: header.cursor, onEvent: (event) => {
        if (!disposed) setView((current) => current ? applyNativeEvent(current, event) : current);
      }, onError: (cause) => { if (!disposed) setError(cause.message); } });
    })().catch((cause: unknown) => { if (!disposed) setError(cause instanceof Error ? cause.message : "Conversation is unavailable"); });
    return () => { disposed = true; stop(); };
  }, [client, conversationId, revision]);
  const older = useCallback(async (): Promise<void> => {
    if (!view?.nextBefore || !conversationId) return;
    try {
      const page = await client.history({ conversationId, scope: "timeline", before: view.nextBefore, limit: 100 });
      if (page.scope !== "timeline") return;
      const runHistory = await loadNativeRunHistory(client, conversationId, page.items, view.runHistory);
      setView((current) => current?.header.conversation.id === conversationId
        ? { ...current, items: mergeTimeline(page.items, current.items), nextBefore: page.nextBefore,
          runHistory: { ...runHistory, runs: mergeRunHistory(runHistory.runs, current.runHistory.runs) } } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Older messages could not be loaded"); }
  }, [view?.nextBefore, view?.runHistory, conversationId, client]);
  return { view: view?.header.conversation.id === conversationId ? view : null, error, older, reload: () => setRevision((value) => value + 1) };
}
