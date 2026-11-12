import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import type { NativeMessageProps } from "@/components/app/types/nativePanels.types";
import { NativeMessageActions } from "./NativeMessageActions";

export function NativeMessage({ item, onLinkClick }: NativeMessageProps) {
  const isUser = item.role === "user";
  // Actions appear once the text is final, so a streaming reply is never copied half-written.
  const showActions = item.complete || isUser;
  return <div className={`group/message flex flex-col gap-1 ${isUser ? "items-end" : ""}`}>
    <article aria-label={`${item.role} message`}
      className={isUser ? "max-w-[85%] rounded-lg bg-muted px-4 py-3" : "native-prose"}>
      <MarkdownRenderer className="min-w-0 break-words" onLinkClick={onLinkClick}>{item.text}</MarkdownRenderer>
    </article>
    {showActions && <NativeMessageActions item={item} />}
  </div>;
}
