import type { ActivityList } from "@/types/conversationState.types";
import type { RuntimeSession } from "@/types/runtimeSession.types";
import { buildActivityList } from "@/state/activityList";
import { affectsSummaries } from "@/state/eventRelevance";
import { useSessionResource } from "./useSessionResource";

/** Active and recent runs across conversations, from `GET /v1/tasks` plus every conversation's latest run. */
export function useActivity(session: RuntimeSession | null, tasksSupported: boolean) {
  return useSessionResource<ActivityList>(session, async (client) => {
    const [tasks, summaries] = await Promise.all([tasksSupported ? client.tasks() : Promise.resolve([]), client.conversations({})]);
    return buildActivityList(tasks, summaries);
  }, { key: tasksSupported ? "tasks" : "summaries", isAffectedBy: affectsSummaries });
}
