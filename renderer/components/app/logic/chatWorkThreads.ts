import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ChatWorkThread } from "@/components/app/types/chatPanels.types";

import { isNoraChat } from "@shared/bots/noraChat";
import { canSettleThread } from "./thread-workspace/settlement";
import { chatWorkPhase } from "./chatWorkGroups";

const TERMINAL = new Set(["completed", "failed", "interrupted"]);
const WORKING = new Set(["queued", "starting", "running", "stopping"]);

/** Collect a task tree without relying on summary ordering or trusting parent links to be acyclic. */
function workTree(summaries: readonly ConversationSummary[], roots: readonly string[]): Set<string> {
  const descendants = new Set(roots);
  // Walk the parent graph once, including workers and bot-to-bot work; visited ids also guard against cycles.
  const children = new Map<string, string[]>();
  for (const { conversation } of summaries) if (conversation.parentId) {
    const siblings = children.get(conversation.parentId) ?? [];
    siblings.push(conversation.id); children.set(conversation.parentId, siblings);
  }
  const queue = [...roots];
  for (let index = 0; index < queue.length; index += 1) for (const id of children.get(queue[index]) ?? []) {
    if (descendants.has(id)) continue;
    descendants.add(id); queue.push(id);
  }
  return descendants;
}

function workThreads(summaries: readonly ConversationSummary[], workspaces: readonly NativeWorkspace[]): ChatWorkThread[] {
  return summaries.map(({ conversation, latestRun, pendingRequestCount, queuedCount }) => ({
    connection: conversation.provider.connection ?? "unknown",
    providerKind: conversation.provider.kind,
    model: conversation.provider.model,
    canSettle: !conversation.archivedAt && canSettleThread({
      target: { kind: "thread", conversationId: conversation.id }, queuedCount,
      active: pendingRequestCount > 0 || !!latestRun && !TERMINAL.has(latestRun.state)
    }),
    latestRun,
    phase: chatWorkPhase({ latestRun, pendingRequestCount, queuedCount }),
    author: conversation.bot ? { botId: conversation.bot.botId, name: conversation.bot.name, role: conversation.bot.role, avatar: conversation.bot.avatar } : null,
    status: conversation.archivedAt ? "Settled" : pendingRequestCount ? "Needs your attention" : conversation.queuePaused && queuedCount ? "Queue paused"
      : queuedCount ? "Queued" : latestRun ? latestRun.state.replaceAll("-", " ") : "Ready",
    id: conversation.id, botId: conversation.bot?.botId ?? null, title: conversation.title,
    workspaceId: conversation.workspace.projectId,
    workspaceName: workspaces.find((entry) => entry.id === conversation.workspace.projectId)?.name ?? null,
    working: !conversation.archivedAt && (queuedCount > 0 || !!latestRun && WORKING.has(latestRun.state)), waiting: !conversation.archivedAt && pendingRequestCount > 0,
    settled: !!conversation.archivedAt, branch: conversation.chatBranch ?? null, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt
  })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** The chat's task tree includes workers started inside its task threads. */
export function buildChatWorkThreads(summaries: readonly ConversationSummary[], chatId: string, workspaces: readonly NativeWorkspace[]): ChatWorkThread[] {
  const ids = workTree(summaries, [chatId]);
  ids.delete(chatId);
  return workThreads(summaries.filter(({ conversation }) => ids.has(conversation.id)), workspaces);
}

/** The bot's side panel follows work across chats, excluding the threads that power those chats themselves. */
export function buildBotWorkThreads(summaries: readonly ConversationSummary[], botId: string, environmentId: string, workspaces: readonly NativeWorkspace[]): ChatWorkThread[] {
  const local = summaries.filter(({ conversation }) => conversation.workspace.environmentId === environmentId);
  // Nora's own work is every ordinary thread: no bot runs it and it is not itself a chat.
  const owned = isNoraChat(botId) ? (conversation: ConversationSummary["conversation"]) => !conversation.bot && !conversation.direct && !conversation.group
    : (conversation: ConversationSummary["conversation"]) => conversation.bot?.botId === botId;
  const roots = local.filter(({ conversation }) => owned(conversation)).map(({ conversation }) => conversation.id);
  const ids = workTree(local, roots);
  const chats = new Set(local.filter(({ conversation }) => conversation.direct || conversation.group).map(({ conversation }) => conversation.id));
  return workThreads(local.filter(({ conversation }) => {
    if (!ids.has(conversation.id)) return false;
    const chatParent = !!conversation.parentId && chats.has(conversation.parentId)
      && !conversation.chatBranch && conversation.source?.kind !== "worker";
    return !chatParent;
  }), workspaces);
}
