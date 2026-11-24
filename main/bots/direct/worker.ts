import { isNoraChat, NORA_CHAT } from "@shared/bots/noraChat";
import { createBotThread, createNoraThread } from "@main/bots/conversations/runner";
import type { DirectWorker, DirectWorkerDeps } from "@main/types/bots/chats.types";

/**
 * A direct chat's bot in one workspace, or null when it is not available there. A configured bot works as itself on its own model;
 * Nora works in ordinary Nora threads on its chat model, so that work lists with the rest of Nora's threads.
 */
export function directWorker(deps: DirectWorkerDeps, workspaceId: string, botId: string): DirectWorker | null {
  if (isNoraChat(botId)) {
    return { profile: NORA_CHAT, start: async (parent, workspace, title, options) => createNoraThread(deps, parent, workspace, title, await deps.noraBinding(workspace), options) };
  }
  const bot = deps.bot(workspaceId, botId);
  return bot ? { profile: bot, start: (parent, workspace, title, options) => createBotThread(deps, parent, bot, workspace, title, options) } : null;
}
