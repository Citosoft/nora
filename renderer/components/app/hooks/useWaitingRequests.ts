import { useEffect, useMemo, useRef, useState } from "react";
import { useThreadCenterPorts } from "./useThreadCenterPorts";
import { attentionSources, buildAttentionToasts } from "@/components/app/logic/attentionToasts";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { AttentionToastsState } from "@/components/app/types/attentionToasts.types";

/**
 * Requests waiting in the threads `include` picks, answerable in place; answered or expired requests drop out on the next refresh.
 * `include` must be stable (memoized) so the threads are only re-read when their waiting state changes.
 */
export function useWaitingRequests(include: (summary: ConversationSummary) => boolean): AttentionToastsState {
  const { state, store } = useThreadCenterPorts();
  const sources = useMemo(() => attentionSources(state.summaries, include), [state.summaries, include]);
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
    // The request belongs to another thread than any open composer, so it is answered through the client, not a document.
    async respond(toast, response) {
      await store.client.execute({ kind: "respond", commandId: crypto.randomUUID(), conversationId: toast.conversation.id, requestId: toast.request.id, response });
      await store.refresh();
    },
    open: (toast) => { store.openThread(toast.conversation.id); },
    dismiss: (toast) => setDismissed((current) => new Set([...current, toast.request.id])) };
}
