import { effectiveBots } from "@shared/bots/catalog";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

/** The bot a tool call names, by id or (case-insensitively) by name, among those available in the workspace. */
export function findBotTarget(options: Pick<NoraToolOperationOptions, "boot">, workspaceId: string, target: string): BotDefinition {
  const boot = options.boot();
  const wanted = target.trim().toLocaleLowerCase();
  const bots = effectiveBots(boot.personalization.bots, workspaceId, boot.sharedBots).map((entry) => entry.bot);
  const bot = bots.find((entry) => entry.id === wanted) ?? bots.find((entry) => entry.name.toLocaleLowerCase() === wanted);
  if (!bot) throw new Error(`No bot called "${target}" here. Available: ${bots.map((entry) => entry.name).join(", ") || "none"}.`);
  return bot;
}
