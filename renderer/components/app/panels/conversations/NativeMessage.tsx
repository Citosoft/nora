import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { MESSAGE_REVEAL_CLASS_NAME } from "@/components/app/logic/messagePins";
import type { NativeMessageProps } from "@/components/app/types/nativePanels.types";
import { NativeMessageActions } from "./NativeMessageActions";
import { SpeakerAvatar } from "@/components/app/shared/SpeakerAvatar";

export function NativeMessage({ item, onLinkClick, mentions, pins, actions = "inline" }: NativeMessageProps) {
  const isUser = item.role === "user";
  // Actions appear once the text is final, so a streaming reply is never copied or pinned half-written.
  const showActions = item.complete || isUser;
  const pinned = !!pins?.isPinned(item.id);
  return <div data-message-id={item.id} data-history-output={!isUser ? item.text : undefined} data-history-prompt={isUser ? item.id : undefined} data-history-text={isUser ? item.text : undefined}
    className={cn("group/message relative flex flex-col gap-1", isUser && "items-end", MESSAGE_REVEAL_CLASS_NAME)}>
    {pinned && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Pin className="size-3" aria-hidden="true" />Pinned</p>}
    {item.author && <div className="flex items-center gap-2 text-sm font-medium">
      <SpeakerAvatar botId={item.author.botId} avatar={item.author.avatar} size={22} /><span>{item.author.name}</span></div>}
    <article aria-label={item.author ? `${item.author.name} message` : `${item.role} message`}
      className={isUser ? "max-w-[85%] rounded-lg bg-muted px-4 py-3" : "native-prose"}>
      <MarkdownRenderer className="min-w-0 break-words" onLinkClick={onLinkClick} showLinkIcons mentions={mentions}>{item.text}</MarkdownRenderer>
    </article>
    {showActions && <NativeMessageActions item={item} placement={actions} pin={pins && item.complete ? { pinned, onToggle: () => pins.toggle(item.id) } : undefined} />}
  </div>;
}
