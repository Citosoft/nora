import { ChevronRight, Info, Plus } from "lucide-react";
import { AppMark } from "@/components/app/shared/AppMark";
import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { ThreadRow } from "@/components/app/panels/threads/ThreadRow";
import { BotRowContextMenu } from "./BotRowContextMenu";
import type { BotNavigationRowProps } from "@/components/app/types/botNavigation.types";

const VISIBLE_THREADS = 10;

/** A bot (or Nora) with its threads; with no threads a click starts one, otherwise the row expands its threads. */
export function BotNavigationRow({ item, expanded, now, onToggle, onStart, onOpen, onTogglePin, onShowAllThreads, onShowInfo, onEdit, onDelete }: BotNavigationRowProps) {
  const { name, role, avatar, threads, state } = item;
  const hasThreads = threads.length > 0;
  const hidden = threads.length - VISIBLE_THREADS;
  return <li>
    <BotRowContextMenu name={name} hasThreads={hasThreads} expanded={expanded} onToggle={onToggle} onStart={onStart} onShowInfo={onShowInfo} onEdit={onEdit} onDelete={onDelete}>
    <div className={`group flex items-center rounded-md ${expanded ? "bg-muted/50" : "hover:bg-muted"}`}>
      <button type="button" onClick={hasThreads ? onToggle : onStart} aria-expanded={hasThreads ? expanded : undefined}
        aria-label={hasThreads ? `${name}, ${threads.length} ${threads.length === 1 ? "thread" : "threads"}` : `Start a thread with ${name}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight aria-hidden="true" className={`size-3 shrink-0 text-muted-foreground transition-transform ${hasThreads ? "" : "invisible"} ${expanded ? "rotate-90" : ""}`} />
        {avatar ? <BotAvatar avatar={avatar} state={state} size={26} className="shrink-0" />
          : <span className="flex size-[26px] shrink-0 items-center justify-center"><AppMark className="size-5 shrink-0" /></span>}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm">{name}</span>
          {role && <span className="block truncate text-xs text-muted-foreground">{role}</span>}</span>
        {hasThreads && <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{threads.length}</span>}
      </button>
      {onShowInfo && <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={`${name} info`} tooltip={`${name} info`} onClick={onShowInfo}><Info className="size-3.5" aria-hidden="true" /></Button>}
      <Button type="button" variant="ghost" size="icon" className="mr-1 size-7 shrink-0 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={`New thread with ${name}`} tooltip={`New thread with ${name}`} onClick={onStart}><Plus className="size-3.5" aria-hidden="true" /></Button>
    </div>
    </BotRowContextMenu>
    {expanded && hasThreads && <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border/60 pl-2">
      {threads.slice(0, VISIBLE_THREADS).map((row) => <ThreadRow key={row.id} row={{ ...row, bot: null, providerKind: null }} now={now} workspace={null} request={null}
        onOpen={onOpen} onTogglePin={onTogglePin} />)}
      {hidden > 0 && <Button type="button" variant="ghost" size="sm" className="h-7 w-full justify-start px-2 text-xs font-normal text-muted-foreground" onClick={onShowAllThreads}>
        {hidden} more in Threads</Button>}
    </div>}
  </li>;
}
