import { GitBranch, SquareArrowOutUpRight } from "lucide-react";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { BotInfoTrigger } from "@/components/app/shared/BotInfoTrigger";
import { cn } from "@/lib/utils";
import { chatTime } from "@/components/app/logic/chatTimeline";
import type { ChatMessageProps } from "@/components/app/types/chatPanels.types";

const AVATAR = 32;
const ACTION = "flex items-center gap-1 rounded px-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** A chat bubble: the user's on the right; a bot's on the left under its face and name, linking to the work behind it. */
export function ChatMessage({ entry, workThread, onOpenThread, onBranch, onLinkClick }: ChatMessageProps) {
  const time = chatTime(entry.createdAt);
  if (entry.from === "user") {
    return <div data-history-prompt={entry.id} data-history-text={entry.text} className={cn("flex flex-col items-end", entry.continued ? "mt-1" : "mt-4")}>
      {/* A primary tint, not a solid fill: MarkdownRenderer paints text with `text-foreground`, so the bubble keeps foreground contrast in both themes. */}
      <article aria-label="Your message" title={time} className="max-w-[80%] rounded-2xl rounded-br-md bg-primary/15 px-4 py-2 ring-1 ring-inset ring-primary/20">
        <MarkdownRenderer className="min-w-0 break-words" onLinkClick={onLinkClick}>{entry.text}</MarkdownRenderer>
      </article>
    </div>;
  }
  const name = entry.author?.name ?? "Nora";
  return <div data-history-output={entry.text} className={cn("flex gap-3", entry.continued ? "mt-1" : "mt-4")}>
    <div className="shrink-0" style={{ width: AVATAR }}>{!entry.continued && entry.author && <BotInfoTrigger botId={entry.author.botId} name={name} className="block rounded-full">
      <BotAvatar avatar={entry.author.avatar} size={AVATAR} /></BotInfoTrigger>}</div>
    <div className="flex min-w-0 max-w-[80%] flex-col items-start gap-1">
      {!entry.continued && <p className="flex items-baseline gap-2 text-sm">{entry.author ? <BotInfoTrigger botId={entry.author.botId} name={name} className="font-medium hover:underline">{name}</BotInfoTrigger>
        : <span className="font-medium">{name}</span>}<time className="text-xs text-muted-foreground" dateTime={entry.createdAt}>{time}</time></p>}
      <article aria-label={`${name} message`} className="native-prose max-w-full rounded-2xl rounded-tl-md bg-muted px-4 py-2">
        <MarkdownRenderer className="min-w-0 break-words" onLinkClick={onLinkClick}>{entry.text}</MarkdownRenderer>
      </article>
      {(entry.workThreadId || (onBranch && entry.author && entry.complete)) && <div className="flex items-center gap-1">
        {entry.workThreadId && <button type="button" onClick={() => entry.workThreadId && onOpenThread(entry.workThreadId)} className={ACTION}
          aria-label={`Show the work ${name} did for this${workThread?.workspaceName ? ` in ${workThread.workspaceName}` : ""}`}>
          <SquareArrowOutUpRight className="size-3" aria-hidden="true" />View work{workThread?.workspaceName ? ` · ${workThread.workspaceName}` : ""}</button>}
        {onBranch && entry.author && entry.complete && <button type="button" onClick={() => onBranch(entry)} className={ACTION}
          aria-label={`Branch a side chat with ${name} from this message`}>
          <GitBranch className="size-3" aria-hidden="true" />Branch</button>}
      </div>}
    </div>
  </div>;
}
