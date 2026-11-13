import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { NativeMessageProps } from "@/components/app/types/nativePanels.types";
import { NativeMessageActions } from "./NativeMessageActions";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { SquareArrowOutUpRight } from "lucide-react";

export function NativeMessage({ item, onLinkClick, onOpenAuthorThread }: NativeMessageProps) {
  const isUser = item.role === "user";
  // Actions appear once the text is final, so a streaming reply is never copied half-written.
  const showActions = item.complete || isUser;
  return <div className={`group/message flex flex-col gap-1 ${isUser ? "items-end" : ""}`}>
    {item.author && <div className="flex items-center gap-2 text-sm font-medium">
      <BotAvatar avatar={item.author.avatar} size={22} /><span>{item.author.name}</span>
      {onOpenAuthorThread && <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs font-normal text-muted-foreground"
        aria-label={`Open ${item.author.name}'s thread`} tooltip={`See what ${item.author.name} did for this reply`}
        onClick={() => item.author && onOpenAuthorThread(item.author.botId)}><SquareArrowOutUpRight className="size-3" aria-hidden="true" />View work</Button>}</div>}
    <article aria-label={item.author ? `${item.author.name} message` : `${item.role} message`}
      className={isUser ? "max-w-[85%] rounded-lg bg-muted px-4 py-3" : "native-prose"}>
      <MarkdownRenderer className="min-w-0 break-words" onLinkClick={onLinkClick}>{item.text}</MarkdownRenderer>
    </article>
    {showActions && <NativeMessageActions item={item} />}
  </div>;
}
