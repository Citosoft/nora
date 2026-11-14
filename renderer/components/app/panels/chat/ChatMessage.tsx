import { SquareArrowOutUpRight } from "lucide-react";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { cn } from "@/lib/utils";
import { chatTime } from "@/components/app/logic/chatTimeline";
import type { ChatMessageProps } from "@/components/app/types/chatPanels.types";

const AVATAR = 32;

/** A chat bubble: the user's on the right; a bot's on the left under its face and name, linking to the work behind it. */
export function ChatMessage({ entry, workThread, onOpenThread, onLinkClick }: ChatMessageProps) {
  const time = chatTime(entry.createdAt);
  if (entry.from === "user") {
    return <div className={cn("flex flex-col items-end", entry.continued ? "mt-1" : "mt-4")}>
      <article aria-label="Your message" title={time} className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-primary-foreground [&_a]:text-primary-foreground [&_a]:underline">
        <MarkdownRenderer className="min-w-0 break-words" onLinkClick={onLinkClick}>{entry.text}</MarkdownRenderer>
      </article>
    </div>;
  }
  const name = entry.author?.name ?? "Nora";
  return <div className={cn("flex gap-3", entry.continued ? "mt-1" : "mt-4")}>
    <div className="shrink-0" style={{ width: AVATAR }}>{!entry.continued && entry.author && <BotAvatar avatar={entry.author.avatar} size={AVATAR} />}</div>
    <div className="flex min-w-0 max-w-[80%] flex-col items-start gap-1">
      {!entry.continued && <p className="flex items-baseline gap-2 text-sm"><span className="font-medium">{name}</span><time className="text-xs text-muted-foreground" dateTime={entry.createdAt}>{time}</time></p>}
      <article aria-label={`${name} message`} className="native-prose max-w-full rounded-2xl rounded-tl-md bg-muted px-4 py-2">
        <MarkdownRenderer className="min-w-0 break-words" onLinkClick={onLinkClick}>{entry.text}</MarkdownRenderer>
      </article>
      {entry.workThreadId && <button type="button" onClick={() => entry.workThreadId && onOpenThread(entry.workThreadId)}
        className="flex items-center gap-1 rounded px-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open the thread where ${name} did this${workThread?.workspaceName ? ` in ${workThread.workspaceName}` : ""}`}>
        <SquareArrowOutUpRight className="size-3" aria-hidden="true" />View work{workThread?.workspaceName ? ` · ${workThread.workspaceName}` : ""}</button>}
    </div>
  </div>;
}
