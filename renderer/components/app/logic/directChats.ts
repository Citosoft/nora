import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ThreadDocument, ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";
import type { NativeDraftInput } from "@/components/app/types/nativeConversation.types";
import { findEffectiveBot } from "@shared/bots/catalog";

/** Whether a conversation is a bot chat (direct or group), shown as a messages-only chat. */
export function isChat(conversation: Pick<Conversation, "direct" | "group">): boolean {
  return !!conversation.direct || !!conversation.group;
}

/**
 * Where a bot's direct chat is stored. A workspace bot's chat lives in its workspace; a global bot's chat lives in Personal
 * (falling back to the workspace it was opened from), since it works in every workspace.
 */
export function directChatHome(boot: NativeBoot, bot: BotDefinition, openedFrom: string): NativeWorkspace | null {
  const onHost = boot.workspaces.filter((entry) => entry.workspace.environmentId === boot.environmentId);
  if (bot.scope.kind === "workspace") { const scope = bot.scope; return onHost.find((entry) => entry.id === scope.workspaceId) ?? null; }
  return onHost.find((entry) => entry.kind === "personal") ?? onHost.find((entry) => entry.id === openedFrom) ?? null;
}

/** The bot's existing direct chat, settled or not; each bot has at most one. */
export function findDirectChat(summaries: readonly ConversationSummary[], bot: BotDefinition): ConversationSummary | null {
  const workspaceId = bot.scope.kind === "workspace" ? bot.scope.workspaceId : null;
  return summaries.find(({ conversation }) => conversation.direct?.botId === bot.id
    && (conversation.direct.scope.kind === "workspace" ? conversation.direct.scope.workspaceId === workspaceId : !workspaceId)) ?? null;
}

/** The create details for a direct-chat draft, or null for other drafts; it throws when the bot or the chat's home is gone. */
export function directDraft(state: Pick<ThreadWorkspaceSnapshot, "boot">, document: ThreadDocument, openedFrom: NativeWorkspace): Pick<NativeDraftInput, "direct"> | null {
  if (!document.direct) return null;
  const bot = findEffectiveBot(state.boot.personalization.bots, openedFrom.id, state.boot.sharedBots, document.direct.botId);
  if (!bot) throw new Error("This bot is no longer available in this workspace. Your message has been retained.");
  const home = directChatHome(state.boot, bot, openedFrom.id);
  if (!home) throw new Error(`${bot.name}'s workspace is unavailable. Your message has been retained.`);
  return { direct: { request: { botId: bot.id, workspaceId: openedFrom.id }, title: bot.name, home } };
}
