import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { BotAvatarStack } from "@/components/app/shared/BotAvatarStack";
import { memberList } from "@/components/app/logic/botThreads";
import { WorkThreadsToggle } from "@/components/app/panels/threads/WorkThreadsToggle";
import type { ChatHeaderProps } from "@/components/app/types/chatPanels.types";

/** Who the chat is with, like a messaging app's title bar. */
export function ChatHeader({ participants, state }: ChatHeaderProps) {
  const group = participants.kind === "group" ? participants : null;
  const writer = group?.members.find((member) => member.botId === group.writer)?.name;
  const lead = group?.members.find((member) => member.botId === group.lead)?.name;
  const subtitle = participants.kind === "direct" ? participants.bot.role
    : [writer ? `${writer} can change files` : "Members read only", lead ? `${lead} leads` : null].filter(Boolean).join(" · ");
  return <header className="flex items-center gap-3 border-b px-5 py-3">
    {participants.kind === "direct" ? <BotAvatar avatar={participants.bot.avatar} state={state} size={36} label={participants.bot.name} />
      : <BotAvatarStack members={participants.members} size={28} label={`Group: ${memberList(participants.members.map((member) => member.name))}`} />}
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[15px] font-semibold">{participants.kind === "direct" ? participants.bot.name : memberList(participants.members.map((member) => member.name))}</h1>
      {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
    </div>
    <WorkThreadsToggle />
  </header>;
}
