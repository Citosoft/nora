import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ChatWorkThread } from "@/components/app/types/chatPanels.types";

const WORKING = new Set(["queued", "starting", "running", "stopping"]);

/** The work threads behind a chat, newest first, with where each runs and whether it is busy or waiting on the user. */
export function buildChatWorkThreads(summaries: readonly ConversationSummary[], chatId: string, workspaces: readonly NativeWorkspace[]): ChatWorkThread[] {
  return summaries.filter(({ conversation }) => conversation.parentId === chatId).map(({ conversation, latestRun, pendingRequestCount }) => ({
    id: conversation.id, botId: conversation.bot?.botId ?? null, title: conversation.title,
    workspaceName: workspaces.find((entry) => entry.id === conversation.workspace.projectId)?.name ?? null,
    working: !conversation.archivedAt && !!latestRun && WORKING.has(latestRun.state), waiting: !conversation.archivedAt && pendingRequestCount > 0,
    updatedAt: conversation.updatedAt
  })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
