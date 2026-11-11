import { ThreadGroupHeader } from "./ThreadGroupHeader";
import { ExternalThreadControls } from "./ExternalThreadControls";
import { useResumableThreads } from "@/components/app/hooks/useResumableThreads";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import { mergeThreadRows } from "@/components/app/logic/thread-workspace/listRows";
import type { ThreadSourceFilter, ThreadSort } from "@/components/app/types/thread-workspace/list.types";
import { useMemo, useState } from "react";
import { ThreadRow } from "./ThreadRow";
import { ThreadToolbar } from "./ThreadToolbar";
import { useThreadPullRequests } from "@/components/app/hooks/useThreadPullRequests";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { Button } from "@/components/ui/button";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { buildThreadGroups, resolveThreadGrouping } from "@/components/app/logic/thread-workspace/groups";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";
import type { ThreadGrouping } from "@/components/app/types/thread-workspace/navigation.types";
import type { ThreadNavigationFilter, ThreadNavigationProps } from "@/components/app/types/thread-workspace/ports.types";

export function ThreadNavigation({ workspaceId: scope, onNew, query = "", unified = false, onNavigate, grouping: savedGrouping, onGroupingChange, sourceFilter: savedSourceFilter, onSourceFilterChange, sort: savedSort, onSortChange }: ThreadNavigationProps = {}) {
  const ports = useThreadNavigationPorts();
  const now = useThreadTime();
  const [localSort, setLocalSort] = useState<ThreadSort>("recent");
  const sort = savedSort ?? localSort;
  const [localSource, setLocalSource] = useState<ThreadSourceFilter>("all");
  const sourceFilter = savedSourceFilter ?? localSource;
  const [filter, setFilter] = useState<ThreadNavigationFilter>("all");
  const [allWorkspaces, setAllWorkspaces] = useState(false);
  const [localGrouping, setLocalGrouping] = useState<ThreadGrouping>("none");
  const workspaceId = allWorkspaces ? null : scope === undefined ? ports.state.layout.focusedWorkspaceId : scope;
  const showWorkspaces = workspaceId === null;
  const grouping = resolveThreadGrouping(savedGrouping ?? localGrouping, showWorkspaces);
  const workspaces = useMemo(() => new Map<string, WorkspaceAvatarIdentity>(ports.state.boot.workspaces.map((workspace) => [
    workspace.id, { id: workspace.shellProjectId ?? workspace.id, name: workspace.name }
  ])), [ports.state.boot.workspaces]);
  const storedRows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return buildThreadNavigation(ports.state, workspaceId, filter).filter((row) =>
      `${row.title} ${showWorkspaces ? workspaces.get(row.workspaceId)?.name ?? "" : ""}`.toLocaleLowerCase().includes(search));
  }, [ports.state, workspaceId, filter, query, showWorkspaces, workspaces]);
  const canDiscover = filter === "all" && sourceFilter !== "nora";
  const resumable = useResumableThreads({ ports, workspaceId, query, sourceFilter, sort, enabled: canDiscover });
  const rows = useMemo(() => mergeThreadRows(storedRows, resumable.rows, sourceFilter, sort), [storedRows, resumable.rows, sourceFilter, sort]);
  const providerLabels = useMemo(() => new Map(ports.state.boot.providers.map((provider) => [provider.kind, provider.label])), [ports.state.boot.providers]);
  const groups = useMemo(() => buildThreadGroups(rows, grouping, workspaces, providerLabels), [rows, grouping, workspaces, providerLabels]);
  const readBranchRequest = useOptionalWorkspaceSidebarPorts()?.readBranchRequest ?? null;
  const requests = useThreadPullRequests(ports.state, rows.map((row) => row.id), readBranchRequest);
  return <section className="flex min-h-0 flex-1 flex-col" aria-label="Threads">
    <ThreadToolbar sort={sort} onSortChange={onSortChange ?? setLocalSort} sourceFilter={sourceFilter} onSourceFilterChange={onSourceFilterChange ?? setLocalSource} canGroupByWorkspace={showWorkspaces} filter={filter} grouping={grouping} onFilterChange={setFilter} onGroupingChange={onGroupingChange ?? setLocalGrouping}
      allWorkspaces={unified ? allWorkspaces : undefined} onScopeChange={setAllWorkspaces} newDisabled={!workspaceId && !onNew}
      onNew={unified ? undefined : () => { onNavigate?.(); if (onNew) onNew(); else if (workspaceId) ports.openDraft(workspaceId); }} />
    {ports.state.error && <div role="alert" className="px-3 pb-2 text-xs"><p>{ports.state.error}</p><Button variant="ghost" size="sm" onClick={ports.refresh}>Retry</Button></div>}
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-2">{groups.map((group) => <div key={group.id} role={group.label ? "group" : undefined} aria-label={group.label ?? undefined} className="space-y-0.5">
      <ThreadGroupHeader group={group} />
      {group.rows.map((row) => <ThreadRow key={row.id} row={row} now={now}
        workspace={showWorkspaces ? workspaces.get(row.workspaceId) ?? { id: row.workspaceId, name: "Unavailable workspace" } : null}
        request={requests[row.id] ?? null} onOpen={(entry) => {
          if (entry.target.kind === "external") void resumable.open(entry.target.entry).then((opened) => { if (opened) onNavigate?.(); });
          else { onNavigate?.(); ports.openRow({ ...entry, target: entry.target }); }
        }} onSetSettled={(entry, settled) => { void resumable.setSettled(entry, settled); }} onTogglePin={ports.togglePin} />)}
    </div>)}
      {!rows.length && <p role="status" className="px-2 py-4 text-xs text-muted-foreground">{ports.state.loading || (canDiscover && resumable.controls.loading) ? "Loading threads…" : query ? "No matching threads." : filter === "all" ? "Start a thread to begin." : "No threads in this view."}</p>}
      {canDiscover ? <ExternalThreadControls state={resumable.controls} /> : resumable.controls.errors.map((message) => <p key={message} role="alert" className="px-2 py-1 text-xs text-destructive">{message}</p>)}
    </div>
  </section>;
}
