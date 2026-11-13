import type { EffectiveBot } from "@shared/types/bots/bots.types";
import type { BotInfo, BotNavigationItem } from "@/components/app/types/botNavigation.types";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

/** Shapes a bot's info panel; null for Nora or a bot no longer in this workspace's catalog. */
export function buildBotInfo(item: BotNavigationItem | undefined, bots: readonly EffectiveBot[], rows: readonly ThreadNavigationRow[],
  providers: ReadonlyMap<string, string>): BotInfo | null {
  const bot = item && bots.find((entry) => entry.bot.id === item.id);
  if (!item || !bot) return null;
  const groups = rows.filter((row) => row.group?.some((member) => member.botId === item.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { item, bot, provider: providers.get(bot.bot.binding.kind) ?? bot.bot.binding.kind, groups };
}
