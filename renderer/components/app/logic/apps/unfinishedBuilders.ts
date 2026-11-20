import type { AppSummary } from "@shared/types/apps/apps.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";

/** Builders without a saved app still need an entry point after their tab is closed. */
export function unfinishedAppBuilders(summaries: readonly ConversationSummary[], apps: readonly AppSummary[], environmentId: string): ConversationSummary[] {
  const savedThreads = new Set(apps.map((app) => app.threadId));
  const savedApps = new Set(apps.map((app) => app.id));
  return summaries.filter(({ conversation }) => conversation.source?.kind === "app" && !conversation.archivedAt
    && conversation.workspace.environmentId === environmentId && !savedThreads.has(conversation.id)
    && (!conversation.source.appId || !savedApps.has(conversation.source.appId)))
    .sort((a, b) => b.conversation.updatedAt.localeCompare(a.conversation.updatedAt));
}
