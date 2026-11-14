import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import type { ThreadBotBadgeProps } from "@/components/app/types/nativePanels.types";

/** The bot a work or ask thread runs as, with the way back to its saved model when the thread overrides it. */
export function ThreadBotBadge({ bot, state, modelOverride, onUseBotModel }: ThreadBotBadgeProps) {
  return <span className="flex min-w-0 items-center gap-2 px-2 text-sm" title={modelOverride ? `${bot.name} is using a different model than its saved one` : undefined}>
    <BotAvatar avatar={bot.avatar} state={state} size={18} label={bot.name} /><span className="truncate" aria-hidden="true">{bot.name}</span>
    {modelOverride && <span className="shrink-0 text-xs text-muted-foreground">(model override)</span>}
    {modelOverride && onUseBotModel && <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={onUseBotModel}>
      Use {bot.name}'s model</Button>}
  </span>;
}
