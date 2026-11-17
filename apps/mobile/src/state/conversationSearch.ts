import type { ConversationSummary } from "@shared/types/conversation/queries.types";

/** Match every word, regardless of case, while preserving the runtime's ordering. */
export function filterConversations(summaries: readonly ConversationSummary[], search: string): ConversationSummary[] {
  const words = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return summaries.filter(({ conversation }) => words.every((word) => conversation.title.toLocaleLowerCase().includes(word)));
}

/** Conversations in one project (all when `projectId` is null), keeping the runtime's ordering. */
export function filterByProject(summaries: readonly ConversationSummary[], projectId: string | null): ConversationSummary[] {
  return projectId ? summaries.filter(({ conversation }) => conversation.workspace.projectId === projectId) : [...summaries];
}
