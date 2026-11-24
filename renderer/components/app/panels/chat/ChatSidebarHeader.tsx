import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeakerAvatar } from "@/components/app/shared/SpeakerAvatar";
import { BotInfoTrigger } from "@/components/app/shared/BotInfoTrigger";
import { useBotInfo } from "@/components/app/hooks/useBotInfo";
import { useNativeConversationPorts } from "@/components/app/hooks/useNativeConversationPorts";
import { isNoraChat } from "@shared/bots/noraChat";
import type { ChatSidebarBot } from "@/components/app/types/chatPanels.types";

/** The direct chat's bot above the sidebar tabs: its face, name and role (opening its info), and a shortcut to configure it. */
export function ChatSidebarHeader({ bot, state }: ChatSidebarBot) {
  const botInfo = useBotInfo();
  const { openBotSettings } = useNativeConversationPorts();
  // Nora has no bot definition to edit; its chat model is set in Bots settings.
  const configure = isNoraChat(bot.botId) ? openBotSettings : botInfo ? () => botInfo.edit(bot.botId) : undefined;
  return <header className="flex items-center gap-3 px-4 pb-3 pt-4">
    <BotInfoTrigger botId={bot.botId} name={bot.name} className="-m-1 flex min-w-0 flex-1 items-center gap-3 p-1">
      <SpeakerAvatar botId={bot.botId} avatar={bot.avatar} state={state} size={32} />
      <span className="min-w-0 space-y-0.5">
        <span className="block truncate text-sm font-semibold leading-tight">{bot.name}</span>
        {bot.role && <span className="block truncate text-xs leading-tight text-muted-foreground">{bot.role}</span>}
      </span>
    </BotInfoTrigger>
    {configure && <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
      aria-label={`Configure ${bot.name}`} tooltip={`Configure ${bot.name}`} onClick={configure}>
      <Settings2 className="size-4" aria-hidden="true" /></Button>}
  </header>;
}
