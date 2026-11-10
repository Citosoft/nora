import { useMemo, useState } from "react";
import { MessageSquare, Pin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import type { ThreadNavigationFilter, ThreadNavigationProps } from "@/components/app/types/thread-workspace/ports.types";

const filters: readonly { id: ThreadNavigationFilter; label: string }[] = [
  { id: "all", label: "All" }, { id: "active", label: "Active" }, { id: "attention", label: "Needs attention" }, { id: "archive", label: "Archive" }
];

/** A section for the existing workspace sidebar, without app chrome or tool navigation. */
export function ThreadNavigation({ workspaceId: scope, onNew }: ThreadNavigationProps = {}) {
  const ports = useThreadNavigationPorts();
  const [filter, setFilter] = useState<ThreadNavigationFilter>("all");
  const workspaceId = scope === undefined ? ports.state.layout.focusedWorkspaceId : scope;
  const rows = useMemo(() => buildThreadNavigation(ports.state, workspaceId, filter), [ports.state, workspaceId, filter]);
  return <section className="flex min-h-0 flex-1 flex-col" aria-label="Threads">
    <div className="flex items-center justify-between px-3 py-2"><h2 className="text-xs font-medium text-muted-foreground">Threads</h2>
      <Button size="icon" variant="ghost" className="size-7" aria-label="New thread" disabled={!workspaceId && !onNew} onClick={() => { if (onNew) onNew(); else if (workspaceId) ports.openDraft(workspaceId); }}><Plus className="size-4" aria-hidden="true" /></Button></div>
    <div className="flex flex-wrap gap-1 px-2 pb-2" aria-label="Filter threads">{filters.map((entry) => <Button key={entry.id} size="sm" variant={filter === entry.id ? "secondary" : "ghost"}
      className="h-7 px-2 text-xs" aria-pressed={filter === entry.id} onClick={() => setFilter(entry.id)}>{entry.label}</Button>)}</div>
    {ports.state.error && <div role="alert" className="px-3 pb-2 text-xs"><p>{ports.state.error}</p><Button variant="ghost" size="sm" onClick={ports.refresh}>Retry</Button></div>}
    <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">{rows.map((row) => <div key={row.id} className={`group flex items-center rounded-lg ${row.selected ? "bg-secondary" : "hover:bg-muted"}`}>
      <button type="button" aria-label={`Open ${row.title}`} aria-current={row.selected ? "page" : undefined} onClick={() => ports.openRow(row)} className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-sm">{row.title}</span>
          <span className="flex flex-wrap gap-x-1 text-[11px] text-muted-foreground"><span>{row.status}</span>{row.queuedCount > 0 && <span>· {row.queuedCount} queued</span>}{row.hasDraft && row.target.kind === "thread" && <span>· Draft</span>}</span></span>
      </button>
      {row.target.kind === "thread" && <Button size="icon" variant="ghost" className="mr-1 size-7 shrink-0" aria-label={`${row.pinned ? "Unpin" : "Pin"} ${row.title}`} aria-pressed={row.pinned}
        onClick={() => { if (row.target.kind === "thread") ports.togglePin(row.target.conversationId); }}><Pin className={`size-3 ${row.pinned ? "fill-current" : "text-muted-foreground"}`} aria-hidden="true" /></Button>}
    </div>)}
      {!rows.length && <p role="status" className="px-2 py-4 text-xs text-muted-foreground">{ports.state.loading ? "Loading threads…" : filter === "all" ? "Start a thread to begin." : "No threads in this view."}</p>}
    </div>
  </section>;
}
