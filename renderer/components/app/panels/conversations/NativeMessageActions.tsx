import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/components/app/hooks/useCopyToClipboard";
import { formatTimestamp } from "@/components/app/logic/utils";
import type { NativeMessageActionsProps } from "@/components/app/types/nativePanels.types";

/** Hover/focus toolbar under a chat message; kept in layout so revealing it never shifts the thread. */
export function NativeMessageActions({ item }: NativeMessageActionsProps) {
  const { copied, copy } = useCopyToClipboard();
  const isUser = item.role === "user";
  return <div role="toolbar" aria-label={`${item.role} message actions`}
    className={`flex items-center gap-0.5 text-muted-foreground opacity-0 transition-opacity focus-within:opacity-100 group-hover/message:opacity-100 ${isUser ? "justify-end" : ""}`}>
    <time dateTime={item.createdAt} className={`px-1 text-xs tabular-nums ${isUser ? "order-first" : "order-last"}`}>
      {formatTimestamp(item.createdAt)}
    </time>
    <Button variant="ghost" size="icon" className="size-7" aria-label={copied ? "Copied" : "Copy message"}
      onClick={() => copy(item.text)}>
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
    </Button>
  </div>;
}
