import { ThreadGroupHeader } from "./ThreadGroupHeader";
import { ThreadGroupRows } from "./ThreadGroupRows";
import { ExternalThreadControls } from "./ExternalThreadControls";
import { useResumableThreads } from "@/components/app/hooks/useResumableThreads";
import { useThreadTime } from "@/components/app/hooks/useThreadTime";
import { mergeThreadRows } from "@/components/app/logic/thread-workspace/listRows";
import type { ThreadListRow, ThreadSourceFilter, ThreadSort } from "@/components/app/types/thread-workspace/list.types";
import { useCallback, useMemo, useState } from "react";
import { ThreadRow } from "./ThreadRow";
import { SettledThreadsSection } from "./SettledThreadsSection";
import { ThreadToolbar } from "./ThreadToolbar";
import { BulkSettleDialog } from "./BulkSettleDialog";
import { canBulkSettleThread } from "@/components/app/logic/thread-workspace/bulkSettlement";
import { useThreadPullRequests } from "@/components/app/hooks/useThreadPullRequests";
import { useOptionalWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { Button } from "@/components/ui/button";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { applyWorkThreadVisibility, buildThreadNavigation } from "@/components/app/logic/thread-workspace/navigation";
import { useWorkThreadVisibility } from "@/components/app/hooks/useWorkThreadVisibility";
import { buildThreadGroups, resolveThreadGrouping } from "@/components/app/logic/thread-workspace/groups";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";
import type { ThreadGrouping } from "@/components/app/types/thread-workspace/navigation.types";
import type { ThreadNavigationFilter, ThreadNavigationProps } from "@/components/app/types/thread-workspace/ports.types";
import type { ThreadRefreshControl } from "@/components/app/types/thread-workspace/toolbar.types";

export function ThreadNavigation({ workspaceId: scope, onNew, query = "", unified = false, onNavigate, grouping: savedGrouping, onGroupingChange, sourceFilter: savedSourceFilter, onSourceFilterChange, sort: savedSort, onSortChange }: ThreadNavigationProps = {}) {
  const ports = useThreadNavigationPorts();
  const now = useThreadTime();
  const [localSort, setLocalSort] = useState<ThreadSort>("recent");
  const sort = savedSort ?? localSort;
  const [localSource, setLocalSource] = useState<ThreadSourceFilter>("all");
  const sourceFilter = savedSourceFilter ?? localSource;
  const [filter, setFilter] = useState<ThreadNavigationFilter>("all");
  const [bulkSettleOpen, setBulkSettleOpen] = useState(false);
  const [allWorkspaces, setAllWorkspaces] = useState(false);
  const [localGrouping, setLocalGrouping] = useState<ThreadGrouping>("none");
  const workspaceId = allWorkspaces ? null : scope === undefined ? ports.state.layout.focusedWorkspaceId : scope;
  const showWorkspaces = workspaceId === null;
  const grouping = resolveThreadGrouping(savedGrouping ?? localGrouping, showWorkspaces);
  const workspaces = useMemo(() => new Map<string, WorkspaceAvatarIdentity>(ports.state.boot.workspaces.map((workspace) => [
    workspace.id, { id: workspace.shellProjectId ?? workspace.id, name: workspace.name }
  ])), [ports.state.boot.workspaces]);
  const { visibility: workThreads } = useWorkThreadVisibility();
  const listRows = useCallback((view: ThreadNavigationFilter) => {
    const search = query.trim().toLocaleLowerCase();
    return applyWorkThreadVisibility(buildThreadNavigation(ports.state, workspaceId, view), workThreads).filter((row) =>
      `${row.title} ${showWorkspaces ? workspaces.get(row.workspaceId)?.name ?? "" : ""}`.toLocaleLowerCase().includes(search));
  }, [ports.state, workspaceId, query, showWorkspaces, workspaces, workThreads]);
  const storedRows = useMemo(() => listRows(filter), [listRows, filter]);
  // The Settled filter already lists these, so the foot section only joins the other views.
  const settledRows = useMemo(() => filter === "settled" ? [] : mergeThreadRows(listRows("settled"), [], sourceFilter, sort), [listRows, filter, sourceFilter, sort]);
  const [settledOpened, setSettledOpened] = useState(false);
  // A search reaches settled threads too, so their matches show without opening the section by hand; collapsing it holds until the search changes.
  const [settledDismissedFor, setSettledDismissedFor] = useState<string | null>(null);
  const searching = query.trim().length > 0;
  const settledExpanded = settledOpened || (searching && settledRows.length > 0 && settledDismissedFor !== query);
  const setSettledExpanded = (expanded: boolean) => { setSettledOpened(expanded); setSettledDismissedFor(expanded || !searching ? null : query); };
  const canDiscover = filter === "all" && sourceFilter !== "nora";
  const resumable = useResumableThreads({ ports, workspaceId, query, sourceFilter, sort, enabled: canDiscover });
  const rows = useMemo(() => mergeThreadRows(storedRows, resumable.rows, sourceFilter, sort), [storedRows, resumable.rows, sourceFilter, sort]);
  const providerLabels = useMemo(() => new Map(ports.state.boot.providers.map((provider) => [provider.kind, provider.label])), [ports.state.boot.providers]);
  const groups = useMemo(() => buildThreadGroups(rows, grouping, workspaces, providerLabels), [rows, grouping, workspaces, providerLabels]);
  // Keyed by scope and grouping too, so a choice for one group never carries to a same-id group in another view.
  const groupKey = (groupId: string) => `${workspaceId ?? "all"}:${grouping}:${groupId}`;
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(() => new Set());
  const toggleKey = (set: typeof setCollapsedGroups, groupId: string) => set((current) => {
    const next = new Set(current); const key = groupKey(groupId);
    if (!next.delete(key)) next.add(key);
    return next;
  });
  const threadForge = useOptionalWorkspaceSidebarPorts()?.threadForge ?? null;
  const requestIds = useMemo(() => [...rows, ...(settledExpanded ? settledRows : [])].map((row) => row.id), [rows, settledRows, settledExpanded]);
  const requests = useThreadPullRequests(ports.state, requestIds, threadForge);
  const renderRow = (row: ThreadListRow) => <ThreadRow key={row.id} row={row} now={now}
    workspace={showWorkspaces ? workspaces.get(row.workspaceId) ?? { id: row.workspaceId, name: "Unavailable workspace" } : null}
    request={requests[row.id] ?? null} onOpen={(entry) => {
      if (entry.target.kind === "external") void resumable.open(entry.target.entry).then((opened) => { if (opened) onNavigate?.(); });
      else { onNavigate?.(); ports.openRow({ ...entry, target: entry.target }); }
    }} onSetSettled={(entry, settled) => { void resumable.setSettled(entry, settled); }}
    onRename={(entry, title) => entry.target.kind === "thread" ? ports.renameThread(entry.target.conversationId, title) : Promise.resolve()}
    onDiscardDraft={(entry) => { if (entry.target.kind === "draft") ports.discardDraft(entry.target.documentId); }}
    onTogglePin={(entry) => {
      if (entry.target.kind === "external") void resumable.pin(entry.target.entry);
      else if (entry.target.kind === "thread") ports.togglePin(entry.target.conversationId);
    }} />;
  const refreshControl: ThreadRefreshControl = {
    loading: ports.state.loading || resumable.controls.loading,
    disabled: ports.state.loading || resumable.controls.loading || resumable.controls.busy,
    onRefresh: () => { ports.refresh(); if (canDiscover) resumable.controls.refresh(); }
  };
  return <section className="flex min-h-0 flex-1 flex-col" aria-label="Threads">
    <ThreadToolbar refresh={refreshControl} onBulkSettle={() => setBulkSettleOpen(true)} bulkSettleDisabled={refreshControl.disabled || !rows.some(canBulkSettleThread)} sort={sort} onSortChange={onSortChange ?? setLocalSort} sourceFilter={sourceFilter} onSourceFilterChange={onSourceFilterChange ?? setLocalSource} canGroupByWorkspace={showWorkspaces} filter={filter} grouping={grouping} onFilterChange={setFilter} onGroupingChange={onGroupingChange ?? setLocalGrouping}
      allWorkspaces={unified ? allWorkspaces : undefined} onScopeChange={setAllWorkspaces} newDisabled={!workspaceId && !onNew}
      onNew={unified ? undefined : () => { onNavigate?.(); if (onNew) onNew(); else if (workspaceId) ports.openDraft(workspaceId); }} />
    {ports.state.error && <div role="alert" className="px-3 pb-2 text-xs"><p>{ports.state.error}</p><Button variant="ghost" size="sm" onClick={ports.refresh}>Retry</Button></div>}
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-2">{groups.map((group) => <div key={group.id} role={group.label ? "group" : undefined} aria-label={group.label ?? undefined} className="space-y-0.5">
      <ThreadGroupHeader group={group} collapsed={collapsedGroups.has(groupKey(group.id))} onToggle={() => toggleKey(setCollapsedGroups, group.id)} />
      {!(group.label && collapsedGroups.has(groupKey(group.id))) && <ThreadGroupRows group={group} expanded={expandedGroups.has(groupKey(group.id))}
        onToggle={() => toggleKey(setExpandedGroups, group.id)} renderRow={renderRow} />}
    </div>)}
      {!rows.length && <p role="status" className="px-2 py-4 text-xs text-muted-foreground">{ports.state.loading || (canDiscover && resumable.controls.loading) ? "Loading threads…" : query ? settledRows.length ? "Only settled threads match." : "No matching threads." : filter === "all" ? "Start a thread to begin." : "No threads in this view."}</p>}
      <ExternalThreadControls state={resumable.controls} />
    </div>
    <SettledThreadsSection rows={settledRows} expanded={settledExpanded} onExpandedChange={setSettledExpanded} renderRow={renderRow} />
    {bulkSettleOpen && <BulkSettleDialog rows={rows} workspaces={workspaces} onClose={() => setBulkSettleOpen(false)}
      onSettle={async (row) => { if (row.target.kind !== "draft") await ports.setSettled(row.target, true); }} />}
  </section>;
}
