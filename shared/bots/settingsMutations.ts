import { emptyBotSettings, workspaceBotSettings } from "./catalog";
import type { BotDefinition, BotScope, BotSettings, WorkspaceBotSettings } from "@shared/types/bots/bots.types";

function withWorkspace(settings: BotSettings, workspaceId: string, change: (current: WorkspaceBotSettings) => WorkspaceBotSettings): BotSettings {
  const next = change(workspaceBotSettings(settings, workspaceId));
  const workspaces = { ...settings.workspaces };
  if (!next.private.length && !next.hidden.length) delete workspaces[workspaceId];
  else workspaces[workspaceId] = next;
  return { ...settings, workspaces };
}

/** The locally stored definition at a scope; shared definitions live in the workspace and are never found here. */
export function storedBot(settings: BotSettings | undefined, scope: BotScope, botId: string): BotDefinition | null {
  if (!settings) return null;
  if (scope.kind === "global") return settings.global.find((bot) => bot.id === botId) ?? null;
  if (scope.storage === "shared") return null;
  return workspaceBotSettings(settings, scope.workspaceId).private.find((bot) => bot.id === botId) ?? null;
}

export function putStoredBot(settings: BotSettings | undefined, bot: BotDefinition): BotSettings {
  const base = settings ?? emptyBotSettings();
  const replace = (bots: readonly BotDefinition[]): BotDefinition[] => [...bots.filter((entry) => entry.id !== bot.id), bot];
  if (bot.scope.kind === "global") return { ...base, global: replace(base.global) };
  if (bot.scope.storage === "shared") throw new Error("Shared bots are stored in their workspace");
  return withWorkspace(base, bot.scope.workspaceId, (current) => ({ ...current, private: replace(current.private) }));
}

export function removeStoredBot(settings: BotSettings | undefined, scope: BotScope, botId: string): BotSettings {
  const base = settings ?? emptyBotSettings();
  if (scope.kind === "global") return { ...base, global: base.global.filter((bot) => bot.id !== botId) };
  if (scope.storage === "shared") return base;
  return withWorkspace(base, scope.workspaceId, (current) => ({ ...current, private: current.private.filter((bot) => bot.id !== botId) }));
}

export function setBotHidden(settings: BotSettings | undefined, workspaceId: string, botId: string, hidden: boolean): BotSettings {
  return withWorkspace(settings ?? emptyBotSettings(), workspaceId, (current) => ({ ...current,
    hidden: hidden ? [...new Set([...current.hidden, botId])] : current.hidden.filter((id) => id !== botId) }));
}

export function sameBotScope(a: BotScope, b: BotScope): boolean {
  return a.kind === "global" ? b.kind === "global"
    : b.kind === "workspace" && a.workspaceId === b.workspaceId && a.storage === b.storage;
}
