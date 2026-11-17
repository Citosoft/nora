import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";

/** First load establishes a baseline; only newly observed terminal outcomes are unread. */
export function unreadCompletions(previous: ThreadWorkspaceSnapshot, summaries: readonly ConversationSummary[]): string[] {
  const unread = new Set(previous.unreadThreadIds);
  const priorRuns = new Map(previous.summaries.map((entry) => [entry.conversation.id, entry.latestRun]));
  for (const { conversation, latestRun } of summaries) {
    if (previous.loading || !latestRun || !["completed", "failed", "interrupted"].includes(latestRun.state)) continue;
    const prior = priorRuns.get(conversation.id);
    if (prior?.id !== latestRun.id || prior.state !== latestRun.state) unread.add(conversation.id);
  }
  return summaries.filter((entry) => unread.has(entry.conversation.id) && !entry.conversation.archivedAt).map((entry) => entry.conversation.id);
}
