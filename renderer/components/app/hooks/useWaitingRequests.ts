import { useMemo, useState } from "react";
import { useThreadCenterPorts } from "./useThreadCenterPorts";
import { useInbox } from "./useInbox";
import { buildAttentionToasts } from "@/components/app/logic/attentionToasts";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { AttentionToastsState } from "@/components/app/types/attentionToasts.types";

/**
 * Requests waiting in the threads `include` picks, answerable in place; answered or expired requests leave with the inbox's
 * next snapshot. `include` must be stable (memoized) so the list is only rebuilt when the inbox or the selection changes.
 */
export function useWaitingRequests(include: (conversation: Conversation) => boolean): AttentionToastsState {
  const { store } = useThreadCenterPorts();
  const { state } = useInbox();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());
  const toasts = useMemo(() => buildAttentionToasts(state.snapshot.items, include, dismissed), [state.snapshot.items, include, dismissed]);
  return { toasts,
    // The request belongs to another thread than any open composer, so it is answered through the client, not a document.
    async respond(toast, response) {
      await store.client.execute({ kind: "respond", commandId: crypto.randomUUID(), conversationId: toast.conversation.id, requestId: toast.request.id, response });
    },
    open: (toast) => { store.openThread(toast.conversation.id); },
    dismiss: (toast) => setDismissed((current) => new Set([...current, toast.request.id])) };
}
