import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useWorkspaceSidebarActions, useWorkspaceSidebarRuntime, useWorkspaceSidebarUi } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import { buildWorkspaceGroups } from "@/components/app/logic/workspaceGroups";
import { ThreadNavigation } from "@/components/app/panels/threads/ThreadNavigation";
import { WorkspaceUtilities } from "@/components/app/sidebar/WorkspaceUtilities";
import { WorkspaceActions } from "@/components/app/sidebar/workspace-navigation/WorkspaceActions";
import { WorkspaceShortcuts } from "@/components/app/sidebar/workspace-navigation/WorkspaceShortcuts";
import { WorkspaceSwitcher } from "@/components/app/sidebar/workspace-navigation/WorkspaceSwitcher";
import { WorkspaceStatusIndicator } from "@/components/app/sidebar/workspace-navigation/WorkspaceStatusIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { effectiveRole } from "@shared/personalization/profiles";

export function WorkspaceSidebar() {
  const snapshot = useCanonicalAppSnapshot();
  const native = useNativeRuntimePorts();
  const navigation = useWorkspaceNavigation();
  const { recentWorkspaces, onOpenRecentWorkspace } = useWorkspaceSidebarPorts();
  const { removingWorkspaceRoots } = useWorkspaceSidebarRuntime();
  const { collapsed } = useWorkspaceSidebarUi();
  const actions = useWorkspaceSidebarActions();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const workspaces = useMemo(() => buildWorkspaceGroups(snapshot, new Set(removingWorkspaceRoots)), [snapshot, removingWorkspaceRoots]);
  const workspace = workspaces.find((entry) => entry.project.id === snapshot?.project?.id);
  const nativeWorkspace = native.boot.workspaces.find((entry) => entry.shellProjectId === workspace?.project.id);
  const role = nativeWorkspace ? effectiveRole(native.boot.personalization, nativeWorkspace.id) : native.boot.personalization.defaultRole;
  const chooseWorkspace = (projectId: string) => { navigation.closeTool(); setQuery(""); setError(null); actions.onFocusWorkspace(projectId); };
  const newThread = () => {
    setError(null); navigation.closeTool();
    void native.launch(workspace ? { projectId: workspace.project.id } : {}).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Thread could not be opened."));
  };
  return <aside aria-label="Workspace navigation" className={`workspace-shell-surface flex h-full min-h-0 flex-col overflow-hidden ${collapsed ? "items-center" : ""}`}>
    <div className={`flex w-full shrink-0 items-center ${collapsed ? "justify-center px-1 py-3" : "gap-1 px-3 pt-3"}`}>
      <WorkspaceSwitcher workspaces={workspaces} activeId={snapshot?.project?.id ?? null} collapsed={collapsed} recentWorkspaces={recentWorkspaces}
        onSelect={chooseWorkspace} onOpenRecent={(rootPath, name) => { navigation.closeTool(); onOpenRecentWorkspace(rootPath, name); }} onAdd={actions.onChooseProject} />
      {!collapsed && workspace && <WorkspaceActions workspace={workspace} />}
      {!collapsed && workspace && <WorkspaceStatusIndicator workspace={workspace} />}
    </div>
    <div className={`w-full shrink-0 ${collapsed ? "flex flex-col items-center gap-1 pb-1" : "space-y-2 px-3 pb-3 pt-2"}`}>
      <Button variant="ghost" size={collapsed ? "icon" : "default"} className={collapsed ? "size-8" : "h-9 w-full justify-start px-2 text-sm font-normal"} onClick={newThread} aria-label="New thread" tooltip={collapsed ? "New thread" : undefined}><Plus className="size-4 text-muted-foreground" aria-hidden="true" />{!collapsed && "New thread"}</Button>
      {!collapsed && <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" /><Input type="search" className="h-8 rounded-md border-transparent bg-transparent pl-8 text-xs shadow-none hover:bg-muted/40 focus-visible:border-border" placeholder="Search threads…" aria-label="Search threads" value={query} onChange={(event) => setQuery(event.target.value)} /></div>}
    </div>
    {workspace && <WorkspaceShortcuts workspace={workspace} role={role} collapsed={collapsed} />}
    {!collapsed && (error || navigation.preferenceError) && <p role="alert" className="px-4 pb-3 text-xs text-destructive">{error ?? navigation.preferenceError}</p>}
    {collapsed ? <div className="min-h-0 flex-1" /> : <ThreadNavigation workspaceId={nativeWorkspace?.id ?? (workspace ? `unregistered:${workspace.project.id}` : null)} query={query} unified onNavigate={navigation.closeTool}
      grouping={navigation.preferences.threadGrouping} onGroupingChange={(threadGrouping) => navigation.setPreferences((current) => ({ ...current, threadGrouping }))} />}
    <div className="w-full shrink-0"><WorkspaceUtilities collapsed={collapsed} /></div>
  </aside>;
}
