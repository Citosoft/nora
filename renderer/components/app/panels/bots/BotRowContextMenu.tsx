import { ChevronRight, Info, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { BotRowContextMenuProps } from "@/components/app/types/botNavigation.types";

/** Right-click actions for a bot in the Bots sidebar; Nora gets only the thread actions. */
export function BotRowContextMenu({ children, name, hasThreads, expanded, onToggle, onStart, onShowInfo, onEdit, onDelete }: BotRowContextMenuProps) {
  return <ContextMenu><ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem onSelect={onStart}><MessageSquarePlus className="size-3.5" aria-hidden="true" />New thread with {name}</ContextMenuItem>
      {hasThreads && <ContextMenuItem onSelect={onToggle}><ChevronRight className={`size-3.5 ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />{expanded ? "Hide threads" : "Show threads"}</ContextMenuItem>}
      {onShowInfo && <ContextMenuItem onSelect={onShowInfo}><Info className="size-3.5" aria-hidden="true" />Bot info</ContextMenuItem>}
      {onEdit && <ContextMenuItem onSelect={onEdit}><Pencil className="size-3.5" aria-hidden="true" />Edit bot…</ContextMenuItem>}
      {onDelete && <ContextMenuItem destructive onSelect={onDelete}><Trash2 className="size-3.5" aria-hidden="true" />Delete bot…</ContextMenuItem>}
    </ContextMenuContent>
  </ContextMenu>;
}
