import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ChatWorkThread } from "@/components/app/types/chatPanels.types";
import type { ChatWorkGroup, ChatWorkPhase } from "@/components/app/types/chatWork.types";

const COMPLETED_THREAD_LIMIT = 10;

/** Pending user requests and queued follow-ups take precedence over the previous turn's outcome. */
export function chatWorkPhase({ latestRun, queuedCount, pendingRequestCount }: Pick<ConversationSummary, "latestRun" | "queuedCount" | "pendingRequestCount">): ChatWorkPhase {
  if (pendingRequestCount) return "in-progress";
  switch (latestRun?.state) {
    case "starting": case "running": case "stopping": case "awaiting-approval": case "awaiting-input": case "recovering":
      return "in-progress";
    case "queued":
      return "pending";
    case "completed":
      return queuedCount ? "pending" : "completed";
    case "failed": case "interrupted":
      return queuedCount ? "pending" : "attention";
    case undefined:
      return "pending";
  }
}

/** Keep recent completed work visible without limiting work that may still need attention; phases with no threads are left out. */
export function groupChatWorkThreads(threads: readonly ChatWorkThread[]): ChatWorkGroup[] {
  const groups: ChatWorkGroup[] = [
    { phase: "in-progress", title: "In progress", threads: [] },
    { phase: "pending", title: "Pending", threads: [] },
    { phase: "attention", title: "Needs attention", threads: [] },
    { phase: "completed", title: "Completed", threads: [] }
  ];
  return groups.map((group) => {
    const sorted = threads.filter((thread) => thread.phase === group.phase && !(thread.settled && !thread.latestRun))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { ...group, threads: group.phase === "completed" ? sorted.slice(0, COMPLETED_THREAD_LIMIT) : sorted };
  }).filter((group) => group.threads.length > 0);
}
