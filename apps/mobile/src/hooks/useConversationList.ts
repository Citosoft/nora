import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { RuntimeSession } from "@/types/runtimeSession.types";
import { affectsSummaries } from "@/state/eventRelevance";
import { useSessionResource } from "./useSessionResource";

/** Open (unsettled) conversations, newest activity first, optionally for one project. */
export function useConversationList(session: RuntimeSession | null, projectId: string | null) {
  return useSessionResource<ConversationSummary[]>(session, async (client) => {
    const summaries = await client.conversations({ settled: false, ...(projectId ? { projectId } : {}) });
    return [...summaries].sort((left, right) => Date.parse(right.conversation.updatedAt) - Date.parse(left.conversation.updatedAt));
  }, { key: projectId ?? "all", isAffectedBy: affectsSummaries });
}
