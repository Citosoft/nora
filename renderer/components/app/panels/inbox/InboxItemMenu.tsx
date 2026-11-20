import { useMemo } from "react";
import { Ellipsis } from "lucide-react";
import { inboxTier } from "@shared/inbox/projection";
import { snoozeChoices } from "@/components/app/logic/inbox/sections";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { InboxItemMenuProps } from "@/components/app/types/inbox.types";
import { InboxSnoozeItems } from "./InboxSnoozeItems";

/** Read, done and snooze actions for an update; needs-you items only snooze, since they clear once resolved. */
export function InboxItemMenu({ item, now, actions }: InboxItemMenuProps) {
  const update = inboxTier(item) === "update";
  const run = (command: Parameters<typeof actions.execute>[0]): void => { void actions.execute(command).catch(() => { /* The page shows the error. */ }); };
  const choices = useMemo(() => snoozeChoices(new Date(now)), [now]);
  return <DropdownMenu widthClassName="w-52" trigger={<Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground"
    aria-label="More actions"><Ellipsis className="size-3.5" aria-hidden="true" /></Button>}>
    <DropdownMenuItem onSelect={() => actions.open(item)}>Open</DropdownMenuItem>
    {update && <DropdownMenuItem onSelect={() => run({ kind: item.readAt ? "mark-unread" : "mark-read", itemIds: [item.id] })}>{item.readAt ? "Mark as unread" : "Mark as read"}</DropdownMenuItem>}
    {update && <DropdownMenuItem onSelect={() => run({ kind: "mark-done", itemIds: [item.id] })}>Done</DropdownMenuItem>}
    <DropdownMenuSeparator />
    <InboxSnoozeItems item={item} choices={choices} onSnooze={(until) => run({ kind: "snooze", itemIds: [item.id], until })}
      onUnsnooze={() => run({ kind: "unsnooze", itemIds: [item.id] })} />
  </DropdownMenu>;
}
