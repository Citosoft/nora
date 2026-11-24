import { Pin } from "lucide-react";
import type { ThreadPinnedMessagesProps } from "@/components/app/types/messagePins.types";
import { ThreadPinnedMessageRow } from "./ThreadPinnedMessageRow";

/** The thread's pinned messages, in the order they were pinned; each jumps to its place in the transcript. */
export function ThreadPinnedMessages({ pins }: ThreadPinnedMessagesProps) {
  return <div className="space-y-2 border-t border-border/50 pt-3">
    <p className="flex items-center gap-1.5 font-medium"><Pin className="size-3.5" aria-hidden="true" />Pinned messages
      {pins.pins.length > 0 && <span className="font-normal tabular-nums text-muted-foreground">{pins.pins.length}</span>}</p>
    {pins.pins.length ? <ul className="space-y-0.5" aria-label="Pinned messages">
      {pins.pins.map((pin) => <ThreadPinnedMessageRow key={pin.itemId} pin={pin} seeking={pins.seeking === pin.itemId}
        onJump={() => pins.jumpTo(pin.itemId)} onUnpin={() => pins.toggle(pin.itemId)} />)}
    </ul> : <p className="text-muted-foreground">Pin a message from its hover menu to keep it here.</p>}
    {pins.notice && <p role="status" className="text-muted-foreground">{pins.notice}</p>}
  </div>;
}
