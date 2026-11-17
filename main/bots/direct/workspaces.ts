import type { BotDefinition, DirectDescriptor } from "@shared/types/bots/bots.types";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ChatWorkspace, DirectPlacement, DirectWorkThread } from "@main/types/bots/chats.types";

/** Workspaces a direct chat may work in: the bot's own workspace, or every workspace a global bot is available in. */
export function directWorkspaces(direct: DirectDescriptor, workspaces: readonly ChatWorkspace[],
  bot: (workspaceId: string, botId: string) => BotDefinition | null): ChatWorkspace[] {
  return workspaces.filter((entry) => direct.scope.kind === "workspace" ? entry.id === direct.scope.workspaceId : !!bot(entry.id, direct.botId));
}

/**
 * Where a direct-chat message may work, and the workspace it works in by default; null when the bot is available nowhere.
 * A pinned run (a routine's) works only in its own workspace.
 */
export function directPlacement(direct: DirectDescriptor, all: readonly ChatWorkspace[], bot: (workspaceId: string, botId: string) => BotDefinition | null,
  pinned: string | null): DirectPlacement | null {
  const workspaces = directWorkspaces(direct, all, bot).filter((entry) => !pinned || entry.id === pinned);
  if (!workspaces.length) return null;
  return { workspaces, defaultWorkspaceId: workspaces.some((entry) => entry.id === direct.workspaceId) ? direct.workspaceId : workspaces[0].id };
}

/** The chat's open work threads in the given workspaces. Branches are the user's side chats: the chat never routes its own messages into them. */
export function openDirectThreads(summaries: readonly ConversationSummary[], chat: Conversation, workspaces: readonly ChatWorkspace[]): DirectWorkThread[] {
  return summaries.flatMap(({ conversation }) => {
    const workspace = workspaces.find((entry) => entry.id === conversation.workspace.projectId);
    return conversation.parentId === chat.id && !conversation.archivedAt && !conversation.chatBranch && workspace ? [{ id: conversation.id, title: conversation.title,
      workspaceId: workspace.id, workspaceName: workspace.name, updatedAt: conversation.updatedAt }] : [];
  });
}
