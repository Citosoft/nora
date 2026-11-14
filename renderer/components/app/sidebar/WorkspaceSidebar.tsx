import { useEffect, useMemo, useState } from "react";
import { effectiveBots, knownBotIds } from "@shared/bots/catalog";
import { NewGroupDialog } from "@/components/app/panels/bots/NewGroupDialog";
import type { GroupRequest } from "@shared/types/bots/bots.types";
import { Home, Plus, Search } from "lucide-react";
import { useWorkspaceSidebarActions, useWorkspaceSidebarRuntime, useWorkspaceSidebarUi } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useThreadNavigationPorts } from "@/components/app/hooks/useThreadNavigationPorts";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { buildWorkspaceGroups } from "@/components/app/logic/workspaceGroups";
import { ThreadNavigation } from "@/components/app/panels/threads/ThreadNavigation";
import { WorkspaceUtilities } from "@/components/app/sidebar/WorkspaceUtilities";
import { WorkspaceActions } from "@/components/app/sidebar/workspace-navigation/WorkspaceActions";
import { WorkspaceSwitcher } from "@/components/app/sidebar/workspace-navigation/WorkspaceSwitcher";
import { WorkspaceStatusIndicator } from "@/components/app/sidebar/workspace-navigation/WorkspaceStatusIndicator";
import { BotNavigation } from "@/components/app/panels/bots/BotNavigation";
import { BotEditorDialog } from "@/components/app/panels/settings/bots/BotEditorDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WorkspaceSidebar() {
  const snapshot = useCanonicalAppSnapshot();
  const native = useNativeRuntimePorts();
  const navigation = useWorkspaceNavigation();
  const { showHome } = useThreadNavigationPorts();
  const { recentWorkspaces, onOpenRecentWorkspace } = useWorkspaceSidebarPorts();
  const { removingWorkspaceRoots } = useWorkspaceSidebarRuntime();
  const { collapsed } = useWorkspaceSidebarUi();
  const actions = useWorkspaceSidebarActions();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [botEditor, setBotEditor] = useState(0);
  const [groupDialog, setGroupDialog] = useState(false);
  const workspaces = useMemo(() => buildWorkspaceGroups(snapshot, new Set(removingWorkspaceRoots)), [snapshot, removingWorkspaceRoots]);
  const workspace = workspaces.find((entry) => entry.project.id === snapshot?.project?.id);
  const nativeWorkspace = native.boot.workspaces.find((entry) => entry.shellProjectId === workspace?.project.id);
  const mode = navigation.preferences.sidebarMode;
  // Each mode searches different things, so switching modes starts a fresh search.
  useEffect(() => setQuery(""), [mode]);
  const chooseWorkspace = (projectId: string) => { navigation.closeTool(); setQuery(""); setError(null); actions.onFocusWorkspace(projectId); };
  const newThread = (group?: GroupRequest) => {
    setError(null); navigation.closeTool();
    void native.launch({ ...(workspace ? { projectId: workspace.project.id } : {}), ...(group ? { group } : {}) })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Thread could not be opened."));
  };
  const messageBot = (botId: string) => {
    setError(null); navigation.closeTool();
    if (!nativeWorkspace) { setError("Open a workspace to message its bots."); return; }
    if (!native.store.openDirect(nativeWorkspace.id, botId)) setError(native.store.snapshot().error ?? "The chat could not be opened.");
  };
  const primary = mode === "bots" ? { label: "New bot", run: () => setBotEditor((current) => current + 1) } : { label: "New thread", run: () => newThread() };
  return <aside aria-label="Workspace navigation" className={`workspace-shell-surface flex h-full min-h-0 flex-col overflow-hidden ${collapsed ? "items-center" : ""}`}>
    <div className={`flex w-full shrink-0 items-center ${collapsed ? "flex-col gap-1 px-1 py-3" : "gap-1 px-3 pt-3"}`}>
      <WorkspaceSwitcher workspaces={workspaces} activeId={snapshot?.project?.id ?? null} collapsed={collapsed} recentWorkspaces={recentWorkspaces}
        onSelect={chooseWorkspace} onOpenRecent={(rootPath, name) => { navigation.closeTool(); onOpenRecentWorkspace(rootPath, name); }} onAdd={actions.onChooseProject} />
      {workspace && <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={mode === "bots" ? "Open Bots home" : "Open workspace home"} tooltip={mode === "bots" ? "Bots home" : "Workspace home"} onClick={() => { navigation.closeTool(); showHome(); }}><Home className="size-4" aria-hidden="true" /></Button>}
      {!collapsed && workspace && <WorkspaceActions workspace={workspace} />}
      {!collapsed && workspace && <WorkspaceStatusIndicator workspace={workspace} />}
    </div>
    <div className={`w-full shrink-0 ${collapsed ? "flex flex-col items-center gap-1 pb-1" : "space-y-2 px-3 pb-3 pt-2"}`}>
      <Button variant="ghost" size={collapsed ? "icon" : "default"} className={collapsed ? "size-8" : "h-9 w-full justify-start px-2 text-sm font-normal"} onClick={primary.run} aria-label={primary.label} tooltip={collapsed ? primary.label : undefined}><Plus className="size-4 text-muted-foreground" aria-hidden="true" />{!collapsed && primary.label}</Button>
      {!collapsed && <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" /><Input type="search" className="h-8 rounded-md border-transparent bg-transparent pl-8 text-xs shadow-none hover:bg-muted/40 focus-visible:border-border" placeholder={mode === "bots" ? "Search bots…" : "Search threads…"} aria-label={mode === "bots" ? "Search bots" : "Search threads"} value={query} onChange={(event) => setQuery(event.target.value)} /></div>}
    </div>
    {!collapsed && (error || navigation.preferenceError) && <p role="alert" className="px-4 pb-3 text-xs text-destructive">{error ?? navigation.preferenceError}</p>}
    {mode === "bots" ? <BotNavigation workspaceId={nativeWorkspace?.id ?? null} workspaceName={nativeWorkspace?.name ?? workspace?.project.name ?? null} query={query} collapsed={collapsed}
      onStart={(botId) => botId ? messageBot(botId) : newThread()} onNavigate={navigation.closeTool}
      onShowThreads={() => navigation.setPreferences((current) => ({ ...current, sidebarMode: "threads" }))}
      onNewGroup={nativeWorkspace ? () => setGroupDialog(true) : undefined} />
    : collapsed ? <div className="min-h-0 flex-1" /> : <ThreadNavigation workspaceId={nativeWorkspace?.id ?? (workspace ? `unregistered:${workspace.project.id}` : null)} query={query} unified onNavigate={navigation.closeTool}
      sort={navigation.preferences.threadSort} onSortChange={(threadSort) => navigation.setPreferences((current) => ({ ...current, threadSort }))}
      sourceFilter={navigation.preferences.threadSourceFilter} onSourceFilterChange={(threadSourceFilter) => navigation.setPreferences((current) => ({ ...current, threadSourceFilter }))}
      grouping={navigation.preferences.threadGrouping} onGroupingChange={(threadGrouping) => navigation.setPreferences((current) => ({ ...current, threadGrouping }))} />}
    <div className="w-full shrink-0"><WorkspaceUtilities collapsed={collapsed} /></div>
    {groupDialog && nativeWorkspace && <NewGroupDialog bots={effectiveBots(native.boot.personalization.bots, nativeWorkspace.id, native.boot.sharedBots)}
      workspaceName={nativeWorkspace.name} onClose={() => setGroupDialog(false)} onCreate={(group) => { setGroupDialog(false); newThread(group); }} />}
    {botEditor > 0 && <BotEditorDialog key={botEditor} target={null} workspace={nativeWorkspace ?? null}
      defaultScope={{ kind: "global" }}
      takenIds={knownBotIds(native.boot.personalization.bots, nativeWorkspace?.id ?? null, native.boot.sharedBots)} onClose={() => setBotEditor(0)} />}
  </aside>;
}
