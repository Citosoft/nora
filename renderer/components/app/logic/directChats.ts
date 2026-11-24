import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ThreadDocument, ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";
import type { NativeDraftInput } from "@/components/app/types/nativeConversation.types";
import { findChatBot } from "@shared/bots/noraChat";
import { directChatHome } from "@shared/bots/directChats";

/** Whether a conversation is a bot chat (direct or group), shown as a messages-only chat. */
export function isChat(conversation: Pick<Conversation, "direct" | "group">): boolean {
  return !!conversation.direct || !!conversation.group;
}

/** The create details for a direct-chat draft, or null for other drafts; it throws when the bot or the chat's home is gone. */
export function directDraft(state: Pick<ThreadWorkspaceSnapshot, "boot">, document: ThreadDocument, openedFrom: NativeWorkspace): Pick<NativeDraftInput, "direct"> | null {
  if (!document.direct) return null;
  const bot = findChatBot(state.boot.personalization.bots, openedFrom.id, state.boot.sharedBots, document.direct.botId);
  if (!bot) throw new Error("This bot is no longer available in this workspace. Your message has been retained.");
  const home = directChatHome(state.boot, bot, openedFrom.id);
  if (!home) throw new Error(`${bot.name}'s workspace is unavailable. Your message has been retained.`);
  return { direct: { request: { botId: bot.id, workspaceId: openedFrom.id }, title: bot.name, home } };
}

/**
 * The workspace a global bot's chat should switch to so it works where you have it open, or null when it already does,
 * is tied to one workspace, or the open workspace cannot run the bot.
 */
export function directWorkspaceToFollow(direct: Conversation["direct"], openWorkspaceId: string, available: readonly Pick<NativeWorkspace, "id">[]): string | null {
  if (!direct || direct.scope.kind !== "global" || direct.workspaceId === openWorkspaceId) return null;
  return available.some((entry) => entry.id === openWorkspaceId) ? openWorkspaceId : null;
}
