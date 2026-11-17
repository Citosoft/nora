import { DIRECT_BINDING } from "@shared/bots/chats";
import { createBotThread } from "@main/bots/conversations/runner";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { Routine } from "@shared/types/bots/routines.types";
import type { BotRunnerDeps } from "@main/types/bots/conversations.types";
import type { RoutineTarget, RoutineWorkspace } from "@main/types/bots/routines.types";

/** The bot's one direct chat for its scope, created on first use; runs posted there are routed to a work thread like any message. */
async function directChat(deps: BotRunnerDeps, bot: BotDefinition, workspace: RoutineWorkspace): Promise<string> {
  const scope = bot.scope.kind === "workspace" ? bot.scope.workspaceId : null;
  const existing = deps.host.summaries().find(({ conversation }) => conversation.direct?.botId === bot.id
    && (conversation.direct.scope.kind === "workspace" ? conversation.direct.scope.workspaceId === scope : scope === null));
  if (existing) return existing.conversation.id;
  const receipt = await deps.host.execute({ kind: "create", commandId: deps.nextId(), conversationId: deps.nextId(), title: bot.name,
    workspace: { ...workspace.workspace, access: "read" }, provider: { ...DIRECT_BINDING }, parentId: null, direct: { botId: bot.id, workspaceId: workspace.id } });
  return receipt.conversationId;
}

/** The routine's own thread, kept across runs; a new one replaces it once it is archived or gone. */
async function routineThread(deps: BotRunnerDeps, routine: Routine, bot: BotDefinition, workspace: RoutineWorkspace): Promise<string> {
  const existing = routine.threadId ? deps.host.header(routine.threadId)?.conversation : null;
  if (existing && !existing.archivedAt) return existing.id;
  return createBotThread(deps, null, bot, { ...workspace.workspace, access: "write" }, routine.name);
}

/**
 * Where a run of the routine goes: the bot's direct chat or the routine's own thread. A chat run is pinned to the routine's
 * workspace, because the chat otherwise works wherever its "Working in" choice or its router points.
 */
export async function routineTarget(deps: BotRunnerDeps, routine: Routine, bot: BotDefinition, workspace: RoutineWorkspace): Promise<RoutineTarget> {
  return routine.runIn === "chat" ? { conversationId: await directChat(deps, bot, workspace), workspaceId: workspace.id }
    : { conversationId: await routineThread(deps, routine, bot, workspace), workspaceId: null };
}
