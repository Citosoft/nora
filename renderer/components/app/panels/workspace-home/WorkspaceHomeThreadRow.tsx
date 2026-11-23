import { Pin, ShieldQuestion } from "lucide-react";
import { ThreadAge } from "../threads/ThreadAge";
import { ThreadRowIdentity } from "../threads/ThreadRowIdentity";
import { ThreadStatusIcon } from "../threads/ThreadStatusIcon";
import type { WorkspaceHomeThreadRowProps } from "@/components/app/types/workspace-home/home.types";

export function WorkspaceHomeThreadRow({ row, providerLabel, now, onOpen }: WorkspaceHomeThreadRowProps) {
  const detail = row.waitingOn ? `${row.waitingOn.name} is waiting for you` : `${row.status}${row.queuedCount > 0 ? ` · ${row.queuedCount} queued` : ""}`;
  return <button type="button" onClick={() => onOpen(row)} aria-label={`Open ${row.title}, ${detail}${row.unread ? ", unread" : ""}`}
    className="group flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
    <span className="flex size-7 shrink-0 items-center justify-center"><ThreadRowIdentity row={row} providerLabel={row.providerKind ? providerLabel : undefined} size="md" /></span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2"><span className={`truncate text-sm ${row.unread ? "font-semibold" : "font-medium"}`}>{row.title}</span>{row.pinned && <Pin className="size-3 shrink-0 text-muted-foreground" aria-label="Pinned" />}</span>
      <span className={`flex items-center gap-1 truncate text-xs ${row.waitingOn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
        {row.waitingOn && <ShieldQuestion className="size-3 shrink-0" aria-hidden="true" />}<span className="truncate">{detail}</span></span>
    </span>
    <ThreadStatusIcon row={row} />
    <ThreadAge updatedAt={row.updatedAt} now={now} className="w-8 text-right text-[11px]" />
  </button>;
}
