import type { EffectiveBot } from "@shared/types/bots/bots.types";
import type { BotInfo, BotNavigationItem } from "@/components/app/types/botNavigation.types";
import type { ThreadNavigationRow } from "@/components/app/types/thread-workspace/ports.types";

/** Shapes the info panel for a bot or Nora; null for a bot no longer in this workspace's catalog. */
export function buildBotInfo(item: BotNavigationItem | undefined, bots: readonly EffectiveBot[], rows: readonly ThreadNavigationRow[],
  providers: ReadonlyMap<string, string>): BotInfo | null {
  if (!item) return null;
  if (item.origin === "built-in") return { kind: "nora", item };
  const bot = bots.find((entry) => entry.bot.id === item.id);
  if (!bot) return null;
  const groups = rows.filter((row) => row.group?.some((member) => member.botId === item.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { kind: "bot", item, bot, provider: providers.get(bot.bot.binding.kind) ?? bot.bot.binding.kind, groups };
}
