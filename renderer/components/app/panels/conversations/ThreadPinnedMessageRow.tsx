import { Loader2, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeakerAvatar } from "@/components/app/shared/SpeakerAvatar";
import { formatTimestamp } from "@/components/app/logic/utils";
import type { ThreadPinnedMessageRowProps } from "@/components/app/types/messagePins.types";

/** One pinned message: who said it and an excerpt that jumps to it, with an unpin button shown on hover or focus. */
export function ThreadPinnedMessageRow({ pin, seeking, onJump, onUnpin }: ThreadPinnedMessageRowProps) {
  const speaker = pin.author?.name ?? (pin.role === "user" ? "You" : "Agent");
  return <li className="group/pin relative">
    <button type="button" className="flex w-full min-w-0 flex-col gap-0.5 rounded-md px-1.5 py-1 pr-8 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Jump to pinned message from ${speaker}: ${pin.text}`} aria-busy={seeking} onClick={onJump}>
      <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
        {pin.author && <SpeakerAvatar botId={pin.author.botId} avatar={pin.author.avatar} size={14} />}
        <span className="truncate font-medium text-foreground">{speaker}</span>
        <time dateTime={pin.messageAt} className="shrink-0 tabular-nums">{formatTimestamp(pin.messageAt)}</time>
        {seeking && <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />}
      </span>
      <span className="line-clamp-2 break-words">{pin.text}</span>
    </button>
    <Button variant="ghost" size="icon" className="absolute right-0.5 top-0.5 size-6 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover/pin:opacity-100"
      aria-label={`Unpin message from ${speaker}`} tooltip="Unpin" onClick={onUnpin}>
      <PinOff className="size-3" aria-hidden="true" />
    </Button>
  </li>;
}
