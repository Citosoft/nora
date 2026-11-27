import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import { taskIdFromPath } from "@shared/taskIdentity";
import type { ActiveTaskThread, ActiveTaskThreads } from "@/components/app/types/taskThreads.types";
import { chatWorkPhase } from "./chatWorkGroups";

/**
 * Keys a task by its stable id rather than its path, so a thread stays linked when finishing the task moves its file
 * into `completed/` (and back when it is reopened).
 */
export function taskThreadKey(projectId: string, taskPath: string): string {
  return `${projectId}:${taskIdFromPath(taskPath)}`;
}

/** A queued first turn counts as active so a task shows as worked on from the moment its thread is started. */
function isActive({ conversation, latestRun, queuedCount, pendingRequestCount }: ConversationSummary): boolean {
  if (conversation.archivedAt) return false;
  return chatWorkPhase({ latestRun, queuedCount, pendingRequestCount }) === "in-progress" || latestRun?.state === "queued";
}

/** Derives each task's newest active thread from the threads started for it, so no separate assignment record can drift. */
export function buildActiveTaskThreads(summaries: readonly ConversationSummary[]): ActiveTaskThreads {
  const threads = new Map<string, ActiveTaskThread>();
  for (const summary of summaries) {
    const { conversation } = summary;
    if (conversation.source?.kind !== "task" || !isActive(summary)) continue;
    const key = taskThreadKey(conversation.source.projectId, conversation.source.path);
    const current = threads.get(key);
    if (current && current.updatedAt >= conversation.updatedAt) continue;
    threads.set(key, {
      id: conversation.id,
      title: conversation.title,
      providerKind: conversation.provider.kind,
      connection: conversation.provider.connection ?? "unknown",
      model: conversation.provider.model,
      waiting: summary.pendingRequestCount > 0,
      updatedAt: conversation.updatedAt
    });
  }
  return threads;
}
