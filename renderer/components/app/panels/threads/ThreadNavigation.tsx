import { useMemo, useState } from "react";
import { ThreadRow } from "./ThreadRow";
import { ThreadToolbar } from "./ThreadToolbar";
import { useThreadPullRequests } from "@/components/app/hooks/useThreadPullRequests";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { Button } from "@/components/ui/button";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { buildThreadGroups } from "@/components/app/logic/thread-workspace/groups";
import { WorkspaceAvatar } from "@/components/app/shared/WorkspaceAvatar";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";
import type { ThreadGrouping } from "@/components/app/types/thread-workspace/navigation.types";
import type { ThreadNavigationFilter, ThreadNavigationProps } from "@/components/app/types/thread-workspace/ports.types";

export function ThreadNavigation({ workspaceId: scope, onNew, query = "", unified = false, onNavigate, grouping: savedGrouping, onGroupingChange }: ThreadNavigationProps = {}) {
  const ports = useThreadNavigationPorts();
  const [filter, setFilter] = useState<ThreadNavigationFilter>("all");
  const [allWorkspaces, setAllWorkspaces] = useState(false);
  const [localGrouping, setLocalGrouping] = useState<ThreadGrouping>("none");
  const grouping = savedGrouping ?? localGrouping;
  const workspaceId = allWorkspaces ? null : scope === undefined ? ports.state.layout.focusedWorkspaceId : scope;
  const showWorkspaces = workspaceId === null;
  const workspaces = useMemo(() => new Map<string, WorkspaceAvatarIdentity>(ports.state.boot.workspaces.map((workspace) => [
    workspace.id, { id: workspace.shellProjectId ?? workspace.id, name: workspace.name }
  ])), [ports.state.boot.workspaces]);
  const rows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return buildThreadNavigation(ports.state, workspaceId, filter).filter((row) =>
      `${row.title} ${showWorkspaces ? workspaces.get(row.workspaceId)?.name ?? "" : ""}`.toLocaleLowerCase().includes(search));
  }, [ports.state, workspaceId, filter, query, showWorkspaces, workspaces]);
  const groups = useMemo(() => buildThreadGroups(rows, grouping, workspaces), [rows, grouping, workspaces]);
  const readBranchRequest = useOptionalWorkspaceSidebarPorts()?.readBranchRequest ?? null;
  const requests = useThreadPullRequests(ports.state, rows.map((row) => row.id), readBranchRequest);
  return <section className="flex min-h-0 flex-1 flex-col" aria-label="Threads">
    <ThreadToolbar filter={filter} grouping={grouping} onFilterChange={setFilter} onGroupingChange={onGroupingChange ?? setLocalGrouping}
      allWorkspaces={unified ? allWorkspaces : undefined} onScopeChange={setAllWorkspaces} newDisabled={!workspaceId && !onNew}
      onNew={unified ? undefined : () => { onNavigate?.(); if (onNew) onNew(); else if (workspaceId) ports.openDraft(workspaceId); }} />
    {ports.state.error && <div role="alert" className="px-3 pb-2 text-xs"><p>{ports.state.error}</p><Button variant="ghost" size="sm" onClick={ports.refresh}>Retry</Button></div>}
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">{groups.map((group) => <div key={group.id} role={group.label ? "group" : undefined} aria-label={group.label ?? undefined} className="space-y-0.5">
      {group.label && <h3 className="flex min-w-0 items-center gap-2 px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
        {group.workspace && <WorkspaceAvatar workspace={group.workspace} size="small" />}
        <span className="min-w-0 flex-1 truncate" title={group.label}>{group.label}</span><span className="text-[10px] tabular-nums">{group.rows.length}</span>
      </h3>}
      {group.rows.map((row) => <ThreadRow key={row.id} row={row}
        workspace={showWorkspaces ? workspaces.get(row.workspaceId) ?? { id: row.workspaceId, name: "Unavailable workspace" } : null}
        request={requests[row.id] ?? null} onOpen={(entry) => { onNavigate?.(); ports.openRow(entry); }} onTogglePin={ports.togglePin} />)}
    </div>)}
      {!rows.length && <p role="status" className="px-2 py-4 text-xs text-muted-foreground">{ports.state.loading ? "Loading threads…" : query ? "No matching threads." : filter === "all" ? "Start a thread to begin." : "No threads in this view."}</p>}
    </div>
  </section>;
}
