import { Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ThreadAgePinSlotProps } from "@/components/app/types/thread-workspace/list.types";
import { ThreadAge } from "./ThreadAge";

const REVEAL = "group-hover:opacity-100 group-focus-within:opacity-100";
const CONCEAL = "group-hover:opacity-0 group-focus-within:opacity-0";

/**
 * Age and pin share one fixed-size cell, so revealing the pin on hover or keyboard focus never shifts the row.
 * The pin stays focusable while transparent so keyboard users can reach it.
 */
export function ThreadAgePinSlot({ updatedAt, now, title, pinned, onTogglePin, disabled = false }: ThreadAgePinSlotProps) {
  return <div className="mr-1 grid size-7 shrink-0 place-items-center [&>*]:[grid-area:1/1]">
    <ThreadAge updatedAt={updatedAt} now={now} className={onTogglePin ? `transition-opacity ${CONCEAL}` : undefined} />
    {onTogglePin && <Button size="icon" variant="ghost" className={`size-7 opacity-0 transition-opacity focus-visible:opacity-100 ${REVEAL}`}
      aria-label={`${pinned ? "Unpin" : "Pin"} ${title}`} aria-pressed={pinned} tooltip={pinned ? "Unpin" : "Pin"} disabled={disabled} onClick={onTogglePin}>
      <Pin className={`size-3 ${pinned ? "fill-current" : "text-muted-foreground"}`} aria-hidden="true" />
    </Button>}
  </div>;
}
