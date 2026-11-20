import { DIRECT_BINDING } from "@shared/bots/chats";
import { effectiveBots } from "@shared/bots/catalog";
import { directChatHome, findDirectChat } from "@shared/bots/directChats";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { CreateBotChatRequest, RemoteBot } from "@shared/types/remote-access/runtimeApi.types";
import { RuntimeFailure } from "./failure";

type RemoteBotScope = RemoteBot["scope"];

const scopeOf = (bot: BotDefinition): RemoteBotScope => bot.scope.kind === "workspace" ? { kind: "workspace", workspaceId: bot.scope.workspaceId } : { kind: "global" };

/** The bots that can start a chat on this runtime: global bots once, plus each workspace's own bots; hidden ones are left out. */
function chattableBots(boot: NativeBoot): BotDefinition[] {
  const settings = boot.personalization.bots;
  const hostWorkspaces = boot.workspaces.filter((entry) => entry.workspace.environmentId === boot.environmentId);
  const scopes: (string | null)[] = [null, ...hostWorkspaces.map((entry) => entry.id)];
  return scopes.flatMap((workspaceId) => effectiveBots(settings, workspaceId, boot.sharedBots)
    .map(({ bot }) => bot)
    .filter((bot) => workspaceId === null ? bot.scope.kind === "global" : bot.scope.kind === "workspace" && bot.scope.workspaceId === workspaceId))
    .filter((bot) => !!directChatHome(boot, bot, boot.workspaces[0]?.id ?? ""));
}

/** Each bot with its existing direct chat, for the remote client's Bots section. */
export function listRemoteBots(boot: NativeBoot, summaries: readonly ConversationSummary[]): RemoteBot[] {
  const onHost = summaries.filter(({ conversation }) => conversation.workspace.environmentId === boot.environmentId);
  return chattableBots(boot).map((bot) => ({ id: bot.id, name: bot.name, role: bot.role, avatar: bot.avatar, scope: scopeOf(bot),
    chatConversationId: findDirectChat(onHost, bot)?.conversation.id ?? null }));
}

/** The create command for a bot's direct chat; the workspace, provider and title come from the bot, never from the client. */
export function botChatCommand(boot: NativeBoot, botId: string, input: CreateBotChatRequest): Extract<ConversationCommand, { kind: "create" }> {
  const bot = chattableBots(boot).find((entry) => entry.id === botId && JSON.stringify(scopeOf(entry)) === JSON.stringify(input.scope));
  const home = bot ? directChatHome(boot, bot, boot.workspaces[0]?.id ?? "") : null;
  if (!bot || !home) throw new RuntimeFailure("not-found", "This bot is not available on this computer.");
  return { kind: "create", commandId: input.commandId, conversationId: input.conversationId, title: bot.name,
    workspace: { ...home.workspace, access: "read" }, provider: { ...DIRECT_BINDING }, parentId: null, direct: { botId: bot.id, workspaceId: home.id } };
}
