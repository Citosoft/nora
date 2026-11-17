import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { canSettleThread } from "@/components/app/logic/thread-workspace/settlement";
import { DiscardDraftDialog } from "./DiscardDraftDialog";
import { RenameThreadDialog } from "./RenameThreadDialog";
import type { ThreadRowContextMenuProps } from "@/components/app/types/thread-workspace/settlement.types";

export function ThreadRowContextMenu({ children, row, onSetSettled, onRename, onDiscardDraft }: ThreadRowContextMenuProps) {
  const [renaming, setRenaming] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const draft = row.target.kind === "draft";
  const rename = row.target.kind === "thread" ? onRename : undefined;
  const settle = draft ? undefined : onSetSettled;
  const discard = draft ? onDiscardDraft : undefined;
  if (!settle && !rename && !discard) return <>{children}</>;
  const Icon = row.settled ? ArchiveRestore : Archive;
  const noun = row.group ? "group" : "thread";
  // Drafts with unsent content ask first; an empty draft has nothing to lose.
  const requestDiscard = () => { if (!discard) return; if (row.hasDraft) setConfirmingDiscard(true); else discard(row); };
  return <>
    <ContextMenu><ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {rename && <ContextMenuItem onSelect={() => setRenaming(true)}><Pencil className="size-3.5" aria-hidden="true" />Rename {noun}…</ContextMenuItem>}
        {settle && <ContextMenuItem disabled={!row.settled && !canSettleThread(row)} onSelect={() => settle(row, !row.settled)}>
          <Icon className="size-3.5" aria-hidden="true" />{row.settled ? `Reopen ${noun}` : `Settle ${noun}`}
        </ContextMenuItem>}
        {discard && <ContextMenuItem destructive disabled={row.status === "Delivery unconfirmed"} onSelect={requestDiscard}>
          <Trash2 className="size-3.5" aria-hidden="true" />Discard draft{row.hasDraft ? "…" : ""}
        </ContextMenuItem>}
      </ContextMenuContent>
    </ContextMenu>
    {renaming && rename && <RenameThreadDialog noun={noun} title={row.title} onRename={(title) => rename(row, title)} onClose={() => setRenaming(false)} />}
    {confirmingDiscard && discard && <DiscardDraftDialog title={row.title} onDiscard={() => discard(row)} onClose={() => setConfirmingDiscard(false)} />}
  </>;
}
