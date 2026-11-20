import { useMemo } from "react";
import { AttentionTrayRow } from "@/components/app/panels/threads/AttentionTrayRow";
import { snoozeChoices } from "@/components/app/logic/inbox/sections";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { InboxRequestRowProps } from "@/components/app/types/inbox.types";
import { InboxSnoozeItems } from "./InboxSnoozeItems";

/** An approval or question, answered in place with the same row the waiting-requests tray uses, plus snoozing. */
export function InboxRequestRow({ item, now, actions }: InboxRequestRowProps) {
  const choices = useMemo(() => snoozeChoices(new Date(now)), [now]);
  const run = (command: Parameters<typeof actions.execute>[0]): void => { void actions.execute(command).catch(() => { /* The page shows the error. */ }); };
  return <AttentionTrayRow toast={{ request: item.request, conversation: item.conversation, notice: item.notice }}
    onRespond={(response) => actions.respond(item, response)} onOpen={() => actions.open(item)}
    menuItems={<><DropdownMenuSeparator /><InboxSnoozeItems item={item} choices={choices} onSnooze={(until) => run({ kind: "snooze", itemIds: [item.id], until })}
      onUnsnooze={() => run({ kind: "unsnooze", itemIds: [item.id] })} /></>} />;
}
