import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ThreadRow } from "./ThreadRow";
import { useThreadPullRequests } from "@/components/app/hooks/useThreadPullRequests";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import type { ThreadNavigationFilter, ThreadNavigationProps } from "@/components/app/types/thread-workspace/ports.types";

const filters: readonly { id: ThreadNavigationFilter; label: string }[] = [
  { id: "all", label: "Recent" }, { id: "active", label: "Active" }, { id: "attention", label: "Needs attention" }, { id: "archive", label: "Archived" }
];
export function ThreadNavigation({ workspaceId: scope, onNew, query = "", unified = false, onNavigate }: ThreadNavigationProps = {}) {
  const ports = useThreadNavigationPorts();
  const [filter, setFilter] = useState<ThreadNavigationFilter>("all");
  const [allWorkspaces, setAllWorkspaces] = useState(false);
  const workspaceId = allWorkspaces ? null : scope === undefined ? ports.state.layout.focusedWorkspaceId : scope;
  const rows = useMemo(() => buildThreadNavigation(ports.state, workspaceId, filter).filter((row) => {
    const workspace = ports.state.boot.workspaces.find((entry) => entry.id === row.workspaceId);
    return `${row.title} ${allWorkspaces ? workspace?.name ?? "" : ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }), [ports.state, workspaceId, filter, query, allWorkspaces]);
  const readBranchRequest = useOptionalWorkspaceSidebarPorts()?.readBranchRequest ?? null;
  const requests = useThreadPullRequests(ports.state, rows.map((row) => row.id), readBranchRequest);
  return <section className="flex min-h-0 flex-1 flex-col" aria-label="Threads">
    <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-1"><h2 className="text-[11px] font-medium text-muted-foreground">Threads</h2>
      <Select value={filter} aria-label="Filter threads" className="h-7 w-auto max-w-36 border-0 bg-transparent px-1 text-[11px] text-muted-foreground shadow-none" onChange={(event) => {
        const entry = filters.find((candidate) => candidate.id === event.target.value); if (entry) setFilter(entry.id);
      }}>{filters.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</Select>
      {!unified && <Button size="icon" variant="ghost" className="size-7" aria-label="New thread" disabled={!workspaceId && !onNew} onClick={() => { onNavigate?.(); if (onNew) onNew(); else if (workspaceId) ports.openDraft(workspaceId); }}><Plus className="size-4" aria-hidden="true" /></Button>}
    </div>
    {unified && <div className="flex items-center gap-1 px-3 pb-2" aria-label="Thread workspace scope">{[{ all: false, label: "This workspace" }, { all: true, label: "All workspaces" }].map((entry) => <Button key={entry.label} variant={allWorkspaces === entry.all ? "secondary" : "ghost"} className="h-6 rounded-md px-2 text-[10px] font-normal" aria-pressed={allWorkspaces === entry.all} onClick={() => setAllWorkspaces(entry.all)}>{entry.label}</Button>)}</div>}
    {ports.state.error && <div role="alert" className="px-3 pb-2 text-xs"><p>{ports.state.error}</p><Button variant="ghost" size="sm" onClick={ports.refresh}>Retry</Button></div>}
    <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">{rows.map((row) => <ThreadRow key={row.id} row={row}
      workspaceName={allWorkspaces ? ports.state.boot.workspaces.find((workspace) => workspace.id === row.workspaceId)?.name ?? "Workspace" : null}
      request={requests[row.id] ?? null} onOpen={(entry) => { onNavigate?.(); ports.openRow(entry); }} onTogglePin={ports.togglePin} />)}
      {!rows.length && <p role="status" className="px-2 py-4 text-xs text-muted-foreground">{ports.state.loading ? "Loading threads…" : query ? "No matching threads." : filter === "all" ? "Start a thread to begin." : "No threads in this view."}</p>}
    </div>
  </section>;
}
