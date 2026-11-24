import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { RemoteBot } from "@shared/types/remote-access/runtimeApi.types";
import type { SaveRemoteBot } from "@shared/types/remote-access/management.types";
import type { BotManagementIntent } from "@/types/botSettings.types";
import { botScopeFromParam } from "./botChats";

export function parseBotManagementIntent(botId: string, create: string, workspaceId: string): BotManagementIntent {
  if (botId) return { kind: "edit", botId, scope: botScopeFromParam(workspaceId || null) };
  return create === "1" ? { kind: "create", workspaceId: workspaceId || null } : { kind: "list" };
}

export function newBotDraft(id: string, seed: number, workspaceId: string | null = null): SaveRemoteBot {
  return { id: `bot-${id}`, name: "", role: "", instructions: "", avatar: { seed }, revision: null,
    scope: workspaceId ? { kind: "workspace", workspaceId, storage: "private" } : { kind: "global" } };
}

export function editBotDraft(bot: BotDefinition): SaveRemoteBot {
  return { id: bot.id, name: bot.name, role: bot.role, instructions: bot.instructions, avatar: bot.avatar, revision: bot.revision, scope: bot.scope };
}

/** Sidebar bots are effective definitions: a private workspace override wins over a shared bot with the same id. */
export function findEditableBot(bots: readonly BotDefinition[], botId: string, scope: RemoteBot["scope"]): BotDefinition | null {
  const matches = bots.filter((bot) => bot.id === botId && (scope.kind === "global" ? bot.scope.kind === "global"
    : bot.scope.kind === "workspace" && bot.scope.workspaceId === scope.workspaceId));
  return matches.find((bot) => bot.scope.kind === "workspace" && bot.scope.storage === "private") ?? matches[0] ?? null;
}
