import { AppImportSourceIcon } from "@/components/app/shared/AppImportSourceIcon";
import type { AppImportBotTabIconProps } from "@/components/app/types/appImport.types";
import { cn } from "@/lib/utils";

/** Grok Bot's app icon, taken from the installed app and bundled in brand-icons. */
const GROK_BOT_ICON = "./brand-icons/grok-bot.png";

export function AppImportBotTabIcon({ tab, className }: AppImportBotTabIconProps) {
  return tab === "grok-bot"
    ? <img src={GROK_BOT_ICON} alt="Grok Bot" draggable={false} className={cn("size-5 shrink-0 rounded-md", className)} />
    : <AppImportSourceIcon source={tab} className={className} />;
}
