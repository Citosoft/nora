import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { RemoteTask } from "@shared/types/remote-access/runtimeApi.types";
import type { ActivityEntry, ActivityList } from "@/types/conversationState.types";
import { runStateKind } from "./executionState";

const settled = new Set(["done", "failed", "stopped"]);

/**
 * Merges `GET /v1/tasks` with each conversation's latest run so results stay visible after the app was closed:
 * active runs first (newest first), then recently finished ones.
 */
export function buildActivityList(tasks: readonly RemoteTask[], summaries: readonly ConversationSummary[], recentLimit = 30): ActivityList {
  const entries = new Map<string, ActivityEntry>();
  for (const summary of summaries) {
    if (!summary.latestRun) continue;
    entries.set(summary.latestRun.id, {
      conversationId: summary.conversation.id, conversationTitle: summary.conversation.title, projectId: summary.conversation.workspace.projectId,
      run: summary.latestRun, label: null, pendingRequestCount: summary.pendingRequestCount, active: !settled.has(runStateKind(summary.latestRun))
    });
  }
  for (const task of tasks) {
    entries.set(task.run.id, {
      conversationId: task.conversationId, conversationTitle: task.conversationTitle, projectId: task.projectId, run: task.run,
      label: task.label || null, pendingRequestCount: task.pendingRequestCount, active: !settled.has(runStateKind(task.run))
    });
  }
  const newestFirst = [...entries.values()].sort((left, right) => Date.parse(right.run.updatedAt) - Date.parse(left.run.updatedAt));
  return { active: newestFirst.filter((entry) => entry.active), recent: newestFirst.filter((entry) => !entry.active).slice(0, recentLimit) };
}
