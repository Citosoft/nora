import { AlarmClock } from "lucide-react";
import { DropdownMenuItem, DropdownMenuSub } from "@/components/ui/dropdown-menu";
import type { InboxSnoozeItemsProps } from "@/components/app/types/inbox.types";

export function InboxSnoozeItems({ item, choices, onSnooze, onUnsnooze }: InboxSnoozeItemsProps) {
  if (item.snoozedUntil) return <DropdownMenuItem onSelect={onUnsnooze}>Unsnooze</DropdownMenuItem>;
  return <DropdownMenuSub label="Snooze" icon={<AlarmClock className="size-3.5" aria-hidden="true" />}>
    {choices.map((choice) => <DropdownMenuItem key={choice.label} onSelect={() => onSnooze(choice.until)}>{choice.label}</DropdownMenuItem>)}
  </DropdownMenuSub>;
}
