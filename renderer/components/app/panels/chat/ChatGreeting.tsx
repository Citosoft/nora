import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { BotAvatarStack } from "@/components/app/shared/BotAvatarStack";
import { memberList } from "@/components/app/logic/botThreads";
import type { ChatGreetingProps } from "@/components/app/types/chatPanels.types";

/** The empty state of a chat nobody has written in yet. */
export function ChatGreeting({ participants }: ChatGreetingProps) {
  if (participants.kind === "direct") {
    const { bot } = participants;
    return <div className="flex flex-col items-center gap-3 py-10 text-center">
      <BotAvatar avatar={bot.avatar} size={84} />
      <h2 className="text-2xl font-medium tracking-tight">Message <span className="text-primary">{bot.name}</span></h2>
      <p className="max-w-md text-sm text-muted-foreground">{bot.role ? `${bot.role}. ` : ""}Ask for anything; each task runs in its own thread you can open from the reply.</p>
    </div>;
  }
  const names = memberList(participants.members.map((member) => member.name));
  return <div className="flex flex-col items-center gap-3 py-10 text-center">
    <BotAvatarStack members={participants.members} size={64} label={`Group: ${names}`} />
    <h2 className="text-2xl font-medium tracking-tight">Chat with <span className="text-primary">{names}</span></h2>
    <p className="max-w-md text-sm text-muted-foreground">@mention who should answer, or Nora picks. Each member replies in turn and works in its own thread.</p>
  </div>;
}
