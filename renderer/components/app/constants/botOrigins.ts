import type { BotNavigationItem } from "@/components/app/types/botNavigation.types";

/** Where a bot is available, as shown on its card and info panel. */
export const BOT_ORIGIN_LABELS: Readonly<Record<BotNavigationItem["origin"], string>> = { "built-in": "Built in", global: "Everywhere", shared: "Shared", private: "Private" };
