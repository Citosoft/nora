import { useCallback, useEffect, useState } from "react";
import type { NativeConversationDeps, NativeConversationView } from "@/components/app/types/nativeConversation.types";
import { applyNativeEvent, mergeTimeline } from "@/components/app/logic/nativeConversationState";

export function useNativeConversation({ client, conversationId }: NativeConversationDeps) {
  const [view, setView] = useState<NativeConversationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let disposed = false;
    let stop = (): void => {};
    setView(null); setError(null);
    if (conversationId) void (async () => {
      const header = await client.header(conversationId);
      if (!header) throw new Error("Conversation was not found on its execution host");
      const history = await client.history({ conversationId, scope: "timeline", limit: 100 });
      if (history.scope !== "timeline") throw new Error("Incompatible conversation history");
      if (disposed) return;
      setView({ header, items: history.items, nextBefore: history.nextBefore });
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
      setView((current) => current?.header.conversation.id === conversationId
        ? { ...current, items: mergeTimeline(page.items, current.items), nextBefore: page.nextBefore } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Older messages could not be loaded"); }
  }, [view?.nextBefore, conversationId, client]);
  return { view, error, older, reload: () => setRevision((value) => value + 1) };
}
