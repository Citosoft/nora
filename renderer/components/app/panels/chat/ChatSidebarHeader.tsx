import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { BotInfoTrigger } from "@/components/app/shared/BotInfoTrigger";
import { useBotInfo } from "@/components/app/hooks/useBotInfo";
import type { ChatSidebarBot } from "@/components/app/types/chatPanels.types";

/** The direct chat's bot above the sidebar tabs: its face, name and role (opening its info), and a shortcut to configure it. */
export function ChatSidebarHeader({ bot, state }: ChatSidebarBot) {
  const botInfo = useBotInfo();
  return <header className="flex items-center gap-3 px-4 pb-3 pt-4">
    <BotInfoTrigger botId={bot.botId} name={bot.name} className="-m-1 flex min-w-0 flex-1 items-center gap-3 p-1">
      <BotAvatar avatar={bot.avatar} state={state} size={32} />
      <span className="min-w-0 space-y-0.5">
        <span className="block truncate text-sm font-semibold leading-tight">{bot.name}</span>
        {bot.role && <span className="block truncate text-xs leading-tight text-muted-foreground">{bot.role}</span>}
      </span>
    </BotInfoTrigger>
    {botInfo && <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
      aria-label={`Configure ${bot.name}`} tooltip={`Configure ${bot.name}`} onClick={() => botInfo.edit(bot.botId)}>
      <Settings2 className="size-4" aria-hidden="true" /></Button>}
  </header>;
}
