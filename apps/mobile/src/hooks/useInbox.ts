import type { RuntimeSession } from "@/types/runtimeSession.types";
import type { MobileInbox } from "@/types/inbox.types";
import { legacyInbox, legacyInboxConversations } from "@/state/inbox";
import { useSessionResource } from "./useSessionResource";

/**
 * The computer's inbox. Newer computers serve it whole, with updates and marks; older ones only list requests, which are
 * gathered here from their conversations. Reloads when conversations, runs or requests change.
 */
export function useInbox(session: RuntimeSession | null, full: boolean) {
  return useSessionResource<MobileInbox>(session, async (client) => {
    if (full) return { items: (await client.inbox()).items, full };
    const summaries = await client.conversations({ settled: false });
    const details = await Promise.all(legacyInboxConversations(summaries).map((conversationId) => client.conversation(conversationId)));
    return { items: legacyInbox(summaries, details, new Date().toISOString()), full };
  }, { key: full ? "inbox" : "requests", isAffectedBy: (events) => events.some((event) => event.payload.kind !== "item") });
}
