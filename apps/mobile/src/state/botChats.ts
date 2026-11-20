import type { Href } from "expo-router";
import type { RemoteBot } from "@shared/types/remote-access/runtimeApi.types";
import { routes } from "@/navigation/routes";

/** Where a bot row leads: its existing chat, or the screen that starts one with the first message. */
export function botChatHref(runtimeId: string, bot: RemoteBot): Href {
  return bot.chatConversationId ? routes.conversation(runtimeId, bot.chatConversationId) : routes.botChat(runtimeId, bot.id, bot.scope);
}

/** The scope a bot route names: a workspace bot carries its workspace id, a global bot none. */
export function botScopeFromParam(workspaceId: string | null): RemoteBot["scope"] {
  return workspaceId ? { kind: "workspace", workspaceId } : { kind: "global" };
}

/** A global and a workspace bot can share an id, so a bot is found by id and scope together. */
export function findBot(bots: readonly RemoteBot[], botId: string, scope: RemoteBot["scope"]): RemoteBot | null {
  const workspaceId = scope.kind === "workspace" ? scope.workspaceId : null;
  return bots.find((bot) => bot.id === botId && (bot.scope.kind === "workspace" ? bot.scope.workspaceId : null) === workspaceId) ?? null;
}
