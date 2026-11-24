import { Check, Copy, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/components/app/hooks/useCopyToClipboard";
import { formatTimestamp } from "@/components/app/logic/utils";
import type { NativeMessageActionsProps } from "@/components/app/types/nativePanels.types";

/**
 * Hover/focus toolbar for a chat message. Inline, it sits under the message and keeps its space so revealing it
 * never shifts the thread; as an overlay it floats over the message's top corner so back-to-back agent messages stay tight.
 */
export function NativeMessageActions({ item, pin, placement }: NativeMessageActionsProps) {
  const { copied, copy } = useCopyToClipboard();
  const isUser = item.role === "user";
  return <div role="toolbar" aria-label={`${item.role} message actions`}
    className={cn("flex items-center gap-0.5 text-muted-foreground opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100",
      isUser && "justify-end",
      placement === "overlay" && "pointer-events-none absolute -top-3 right-0 z-10 rounded-md border bg-background shadow-sm focus-within:pointer-events-auto group-hover/message:pointer-events-auto")}>
    <time dateTime={item.createdAt} className={`px-1 text-xs tabular-nums ${isUser ? "order-first" : "order-last"}`}>
      {formatTimestamp(item.createdAt)}
    </time>
    <Button variant="ghost" size="icon" className="size-7" aria-label={copied ? "Copied" : "Copy message"}
      onClick={() => copy(item.text)}>
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
    </Button>
    {pin && <Button variant="ghost" size="icon" className="size-7" aria-label={pin.pinned ? "Unpin message" : "Pin message"}
      tooltip={pin.pinned ? "Unpin" : "Pin to thread details"} aria-pressed={pin.pinned} onClick={pin.onToggle}>
      {pin.pinned ? <PinOff className="size-3.5" aria-hidden="true" /> : <Pin className="size-3.5" aria-hidden="true" />}
    </Button>}
  </div>;
}
