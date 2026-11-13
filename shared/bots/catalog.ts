import type { BotDefinition, BotOrigin, BotSettings, EffectiveBot, SharedBotSet, WorkspaceBotSettings } from "@shared/types/bots/bots.types";

export const EMPTY_WORKSPACE_BOTS: Readonly<WorkspaceBotSettings> = { private: [], hidden: [] };

export function emptyBotSettings(): BotSettings { return { global: [], workspaces: {} }; }

export function workspaceBotSettings(settings: BotSettings | undefined, workspaceId: string): WorkspaceBotSettings {
  return settings && Object.hasOwn(settings.workspaces, workspaceId) ? settings.workspaces[workspaceId] : EMPTY_WORKSPACE_BOTS;
}

/**
 * Global bots, then the workspace's shared bots, then its private bots; each layer overrides an earlier bot with the
 * same id, and hidden ids are removed last. A null workspace yields the global catalog.
 */
export function effectiveBots(settings: BotSettings | undefined, workspaceId: string | null, shared: readonly SharedBotSet[]): EffectiveBot[] {
  const layers: [BotOrigin, readonly BotDefinition[]][] = [["global", settings?.global ?? []]];
  if (workspaceId) {
    layers.push(["shared", shared.find((entry) => entry.workspaceId === workspaceId)?.bots ?? []]);
    layers.push(["private", workspaceBotSettings(settings, workspaceId).private]);
  }
  const byId = new Map<string, EffectiveBot>();
  for (const [origin, bots] of layers) {
    for (const bot of bots) {
      const previous = byId.get(bot.id);
      byId.set(bot.id, { bot, origin, overrides: previous ? [...previous.overrides, previous.origin] : [] });
    }
  }
  const hidden = new Set(workspaceId ? workspaceBotSettings(settings, workspaceId).hidden : []);
  return [...byId.values()].filter((entry) => !hidden.has(entry.bot.id))
    .sort((a, b) => a.bot.name.localeCompare(b.bot.name, undefined, { sensitivity: "base" }) || a.bot.id.localeCompare(b.bot.id));
}

export function findEffectiveBot(settings: BotSettings | undefined, workspaceId: string, shared: readonly SharedBotSet[], botId: string): BotDefinition | null {
  return effectiveBots(settings, workspaceId, shared).find((entry) => entry.bot.id === botId)?.bot ?? null;
}

/** A readable, collision-free slug for a new bot; ids never change after creation so files and threads stay attached. */
export function newBotId(name: string, taken: ReadonlySet<string>): string {
  const base = name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "bot";
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/** Every id a new bot must avoid: global ids plus the workspace's shared and private ones, so a new bot never silently overrides another. */
export function knownBotIds(settings: BotSettings | undefined, workspaceId: string | null, shared: readonly SharedBotSet[]): Set<string> {
  const ids = new Set((settings?.global ?? []).map((bot) => bot.id));
  if (workspaceId) {
    for (const bot of shared.find((entry) => entry.workspaceId === workspaceId)?.bots ?? []) ids.add(bot.id);
    for (const bot of workspaceBotSettings(settings, workspaceId).private) ids.add(bot.id);
  }
  return ids;
}
