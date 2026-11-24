import { createBotThread } from "@main/bots/conversations/runner";
import { taskTitle } from "@main/bots/direct/routing";
import { directWorkspaces } from "@main/bots/direct/workspaces";
import { branchPrompt } from "./branchPrompt";
import { chatBranchOrigin } from "@shared/bots/branches/origin";
import { chatBotFor } from "@shared/bots/noraChat";
import { directWorker } from "@main/bots/direct/worker";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ChatBranchRequest } from "@shared/ipc/types/chatBranchGateway.types";
import type { ChatBranchDeps, ChatBranchPlacement, DirectWorker } from "@main/types/bots/chats.types";

/** A direct chat's branch works where the chat is working; a group member's works in the group's workspace with that member's access. */
function placement(deps: ChatBranchDeps, chat: Conversation, botId: string): { worker: DirectWorker; at: ChatBranchPlacement } {
  if (chat.direct) {
    if (chat.direct.botId !== botId) throw new Error("This bot is not part of this chat.");
    const workspaces = directWorkspaces(chat.direct, deps.workspaces(), chatBotFor(deps.bot));
    const workspace = workspaces.find((entry) => entry.id === chat.direct?.workspaceId) ?? workspaces[0];
    const worker = workspace && directWorker(deps, workspace.id, botId);
    if (!workspace || !worker) throw new Error(`${chat.direct.name} is not available in any open workspace.`);
    return { worker, at: { workspaceId: workspace.id, workspace: { ...workspace.workspace, access: "write" } } };
  }
  if (chat.group) {
    const member = chat.group.members.find((entry) => entry.botId === botId);
    if (!member) throw new Error("This bot is not a member of this group.");
    const bot = deps.bot(chat.workspace.projectId, botId);
    if (!bot) throw new Error(`${member.name} is no longer available in this workspace.`);
    return { worker: { profile: bot, start: (parent, workspace, title, options) => createBotThread(deps, parent, bot, workspace, title, options) },
      at: { workspaceId: chat.workspace.projectId, workspace: { ...chat.workspace, access: chat.group.writer === botId ? "write" : "read" } } };
  }
  throw new Error("Only bot and group chats can branch.");
}

/** A branch started without a name is named from its first message once it exists; the placeholder stays if naming fails or you renamed it. */
async function renameFromFirstMessage(deps: ChatBranchDeps, conversationId: string, placeholder: string, text: string): Promise<void> {
  try {
    const title = await deps.name(text);
    if (deps.host.header(conversationId)?.conversation.title !== placeholder) return;
    await deps.host.execute({ kind: "rename", commandId: deps.nextId(), conversationId, title });
  } catch {
    // The first line of the message remains a usable name.
  }
}

/** Starts a side chat with one of a chat's bots and sends its first message there; retries with the same ids are safe. */
export async function startChatBranch(deps: ChatBranchDeps, request: ChatBranchRequest): Promise<string> {
  const chat = deps.host.header(request.chatId)?.conversation;
  if (!chat) throw new Error("This chat no longer exists.");
  const { worker, at } = placement(deps, chat, request.botId);
  const { ids } = request;
  const page = deps.host.conversationHistory({ conversationId: chat.id, scope: "timeline", limit: 200 });
  const items = page.scope === "timeline" ? page.items : [];
  const instruction = branchPrompt(worker.profile.name, items, request.fromItemId, request.text);
  if (!deps.host.header(ids.conversationId)) {
    const from = request.fromItemId ? items.find((item) => item.id === request.fromItemId) : null;
    const chatBranch = { from: from?.kind === "message" ? chatBranchOrigin(from) : null };
    const title = request.title ?? taskTitle(request.text);
    await worker.start(chat, at.workspace, title, { chatBranch, ids: { commandId: ids.createCommandId, conversationId: ids.conversationId } });
    if (!request.title) void renameFromFirstMessage(deps, ids.conversationId, title, request.text);
  }
  await deps.host.execute({ kind: "submit", commandId: ids.submitCommandId, conversationId: ids.conversationId, runId: ids.runId, instruction, chatText: request.text });
  return ids.conversationId;
}
