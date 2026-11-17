import type { InboxRequest } from "@/types/conversationState.types";
import type { RuntimeSession } from "@/types/runtimeSession.types";
import { conversationsAwaitingDecision } from "@/state/activityList";
import { affectsSummaries } from "@/state/eventRelevance";
import { useSessionResource } from "./useSessionResource";

/** Every pending approval or question on the runtime: conversations with pending requests, then each one's header. */
export function useApprovalsInbox(session: RuntimeSession | null, tasksSupported: boolean) {
  return useSessionResource<InboxRequest[]>(session, async (client) => {
    const [tasks, summaries] = await Promise.all([tasksSupported ? client.tasks() : Promise.resolve([]), client.conversations({ settled: false })]);
    const details = await Promise.all(conversationsAwaitingDecision(tasks, summaries).map((conversationId) => client.conversation(conversationId)));
    return details.flatMap((detail) => detail.header.pendingRequests.filter((request) => request.status === "pending").map((request) => ({
      conversationId: detail.header.conversation.id, conversationTitle: detail.header.conversation.title, request
    }))).sort((left, right) => Date.parse(left.request.createdAt) - Date.parse(right.request.createdAt));
  }, { key: tasksSupported ? "tasks" : "summaries", isAffectedBy: (events) => events.some((event) => event.payload.kind === "request") || affectsSummaries(events) });
}
