import { SpeakerAvatar } from "@/components/app/shared/SpeakerAvatar";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { chatTime } from "@/components/app/logic/chatTimeline";
import type { ChatThreadReplyCardProps } from "@/components/app/types/chatThreadDetail.types";

/** The thread's latest reply in full, with anything waiting on the user (questions and approvals) beneath it. */
export function ChatThreadReplyCard({ bot, reply, children }: ChatThreadReplyCardProps) {
  return <article aria-label={`${bot.name}'s latest reply`} className="rounded-xl bg-muted/60 p-3">
    <header className="mb-1.5 flex items-center gap-2 text-[12px]">
      <SpeakerAvatar botId={bot.botId} avatar={bot.avatar} size={22} /><span className="font-medium">{bot.name}</span>
      <time dateTime={reply.at} className="ml-auto text-xs text-muted-foreground">{chatTime(reply.at)}</time>
    </header>
    <MarkdownRenderer showLinkIcons className="native-prose min-w-0 break-words text-[12px]">{reply.text}</MarkdownRenderer>
    {children}
  </article>;
}
