import { useEffect, useMemo, useRef, useState } from "react";
import { useThreadCenterPorts } from "./useThreadCenterPorts";
import { attentionSources, buildAttentionToasts } from "@/components/app/logic/attentionToasts";
import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { AttentionToastsState } from "@/components/app/types/attentionToasts.types";

/** Requests waiting in threads other than the one on screen, answerable in place; answered or expired requests drop out on the next refresh. */
export function useAttentionToasts(): AttentionToastsState {
  const { state, store } = useThreadCenterPorts();
  const active = state.layout.documents.find((entry) => entry.id === state.layout.activeId);
  const viewed = active?.target.kind === "thread" ? active.target.conversationId : null;
  const sources = useMemo(() => attentionSources(state.summaries, viewed), [state.summaries, viewed]);
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const sourceKey = sources.map((source) => `${source.conversationId}@${source.revision}`).join("|");
  const [headers, setHeaders] = useState<ReadonlyMap<string, ConversationHeader>>(() => new Map());
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  // Summaries only count waiting requests; the request details come from each thread's header, re-read whenever that count or run changes.
  useEffect(() => {
    let cancelled = false;
    void Promise.all(sourcesRef.current.map(async ({ conversationId }) => [conversationId, await store.client.header(conversationId).catch(() => null)] as const))
      .then((entries) => { if (!cancelled) setHeaders(new Map(entries.flatMap(([id, header]) => header ? [[id, header] as const] : []))); });
    return () => { cancelled = true; };
  }, [sourceKey, store.client]);
  const toasts = useMemo(() => buildAttentionToasts(sources, headers, state.summaries, dismissed), [sources, headers, state.summaries, dismissed]);
  return { toasts,
    async respond(toast, response) {
      await store.client.execute({ kind: "respond", commandId: crypto.randomUUID(), conversationId: toast.conversation.id, requestId: toast.request.id, response });
      await store.refresh();
    },
    open: (toast) => { store.openThread(toast.conversation.id); },
    dismiss: (toast) => setDismissed((current) => new Set([...current, toast.request.id])) };
}
