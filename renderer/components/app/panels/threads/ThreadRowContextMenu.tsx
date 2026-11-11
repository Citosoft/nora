import { Archive, ArchiveRestore } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { canSettleThread } from "@/components/app/logic/thread-workspace/settlement";
import type { ThreadRowContextMenuProps } from "@/components/app/types/thread-workspace/settlement.types";

export function ThreadRowContextMenu({ children, row, onSetSettled }: ThreadRowContextMenuProps) {
  if (!onSetSettled || row.target.kind === "draft") return <>{children}</>;
  const Icon = row.settled ? ArchiveRestore : Archive;
  return <ContextMenu><ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
    <ContextMenuContent><ContextMenuItem disabled={!row.settled && !canSettleThread(row)} onSelect={() => onSetSettled(row, !row.settled)}>
      <Icon className="size-3.5" aria-hidden="true" />{row.settled ? "Reopen thread" : "Settle thread"}
    </ContextMenuItem></ContextMenuContent>
  </ContextMenu>;
}
