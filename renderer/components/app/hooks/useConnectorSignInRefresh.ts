import { useEffect, useRef } from "react";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ThreadConnectorsState } from "@/components/app/types/threadConnectors.types";

/**
 * Re-reads the thread's connectors when the model asks for a sign-in during this view: the request means the runtime's
 * connection state likely changed since the thread opened. Requests already in loaded history never trigger a refresh.
 */
export function useConnectorSignInRefresh(conversationId: string | null, items: readonly TimelineItem[], connectors: ThreadConnectorsState | null): void {
  const seen = useRef<{ conversationId: string | null; ids: Set<string> }>({ conversationId: null, ids: new Set() });
  useEffect(() => {
    const requests = items.filter((item) => item.kind === "connector-sign-in").map((item) => item.id);
    if (seen.current.conversationId !== conversationId) {
      seen.current = { conversationId, ids: new Set(requests) };
      return;
    }
    const fresh = requests.filter((id) => !seen.current.ids.has(id));
    fresh.forEach((id) => seen.current.ids.add(id));
    if (fresh.length) connectors?.refresh();
  }, [conversationId, items, connectors]);
}
