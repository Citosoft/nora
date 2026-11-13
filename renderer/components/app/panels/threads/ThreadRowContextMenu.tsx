import { useState } from "react";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { canSettleThread } from "@/components/app/logic/thread-workspace/settlement";
import { RenameThreadDialog } from "./RenameThreadDialog";
import type { ThreadRowContextMenuProps } from "@/components/app/types/thread-workspace/settlement.types";

export function ThreadRowContextMenu({ children, row, onSetSettled, onRename }: ThreadRowContextMenuProps) {
  const [renaming, setRenaming] = useState(false);
  const rename = row.target.kind === "thread" ? onRename : undefined;
  if (row.target.kind === "draft" || (!onSetSettled && !rename)) return <>{children}</>;
  const Icon = row.settled ? ArchiveRestore : Archive;
  const noun = row.group ? "group" : "thread";
  return <>
    <ContextMenu><ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {rename && <ContextMenuItem onSelect={() => setRenaming(true)}><Pencil className="size-3.5" aria-hidden="true" />Rename {noun}…</ContextMenuItem>}
        {onSetSettled && <ContextMenuItem disabled={!row.settled && !canSettleThread(row)} onSelect={() => onSetSettled(row, !row.settled)}>
          <Icon className="size-3.5" aria-hidden="true" />{row.settled ? `Reopen ${noun}` : `Settle ${noun}`}
        </ContextMenuItem>}
      </ContextMenuContent>
    </ContextMenu>
    {renaming && rename && <RenameThreadDialog noun={noun} title={row.title} onRename={(title) => rename(row, title)} onClose={() => setRenaming(false)} />}
  </>;
}
