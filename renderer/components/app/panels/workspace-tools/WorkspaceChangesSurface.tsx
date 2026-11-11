import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useWorkspaceView } from "@/components/app/hooks/useWorkspaceView";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useAppMainCenterContent } from "@/components/app/context/appMainCenterContentContext";
import { WorkspaceSessionPanelProvider } from "@/components/app/context/workspaceSessionPanelContext";
import { buildWorkspaceGroups } from "@/components/app/logic/workspaceGroups";
import { ChangesPanelSection } from "@/components/app/panels/ChangesPanelSection";
import { DiffViewer } from "@/components/app/panels/DiffViewer";
import { FullDiffViewer } from "@/components/app/panels/FullDiffViewer";
import { SessionTabPane, SessionTabStack } from "@/components/app/panels/SessionTabStack";
import { WorkspaceToolHeader } from "./WorkspaceToolHeader";
import { WorkspaceWorktreesTool } from "./WorkspaceWorktreesTool";
import { WorkspaceEditor } from "./WorkspaceEditor";
import type { WorkspaceChangesSurfaceProps } from "@/components/app/types/workspaceNavigation.types";
import type { ChangesPanelSectionProps } from "@/components/app/types/changesPanel.types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** One mounted panel moves between sidebar and center so commit, search and file drafts survive navigation. */
export function WorkspaceChangesSurface({ panel, collapsed, swapped, onStartResize }: WorkspaceChangesSurfaceProps) {
  const { route, openTool } = useWorkspaceNavigation();
  const snapshot = useCanonicalAppSnapshot();
  const { workspaceSessionPanelProps } = useAppMainCenterContent();
  const projectId = snapshot?.project?.id ?? "";
  const workspace = buildWorkspaceGroups(snapshot, new Set()).find((entry) => entry.project.id === projectId);
  const { view, updateView } = useWorkspaceView(projectId);
  const tool = route?.tool === "files" || route?.tool === "changes" ? route.tool : null;
  const worktrees = tool === "changes" && view.changesTab === "worktrees";
  const props: ChangesPanelSectionProps = tool ? { ...panel,
    chrome: { ...panel.chrome, collapsed: false,
      activeTab: tool === "files" ? "files" : panel.chrome.activeTab === "files" ? "git" : panel.chrome.activeTab,
      availableTabs: panel.chrome.availableTabs.filter((tab) => tool === "files" ? tab === "files" : tab !== "files"),
      onActiveTabChange: panel.chrome.onActiveTabChange,
      onSelectChange: async (path) => { updateView({ reviewMode: "file" }); await panel.chrome.onSelectChange(path); },
      onEditChange: (path) => { panel.chrome.onEditChange(path); updateView({ filePath: path }); openTool(projectId, "files"); },
      onOpenFullDiff: () => updateView({ reviewMode: "all" }) },
    fileHandlers: { ...panel.fileHandlers, openFileEditor: async (path, options) => {
      await panel.fileHandlers.openFileEditor(path, options); updateView({ filePath: path });
    } }
  } : panel;
  return <div className={tool ? "relative z-30 flex min-h-0 min-w-0 flex-col overflow-hidden bg-background" : collapsed ? "invisible min-h-0 overflow-hidden" : "relative flex min-h-0 min-w-0 flex-col"} style={{ gridColumn: tool ? 2 : swapped ? 1 : 3, gridRow: 1 }}>
    {tool && <WorkspaceToolHeader title={tool === "files" ? "Files" : "Changes"} workspaceName={snapshot?.project?.name ?? "Workspace"} />}
    {tool === "changes" && <div className="shrink-0 border-b border-border/60 px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><Tabs value={view.changesTab} onValueChange={(value) => { if (value === "changes" || value === "worktrees") updateView({ changesTab: value }); }}><TabsList><TabsTrigger value="changes">Review changes</TabsTrigger><TabsTrigger value="worktrees">Branches &amp; worktrees</TabsTrigger></TabsList></Tabs>
        {!worktrees && <div className="flex gap-1"><Button variant={view.reviewMode === "file" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => updateView({ reviewMode: "file" })}>Selected file</Button><Button variant={view.reviewMode === "all" ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => updateView({ reviewMode: "all" })}>All changes</Button></div>}
      </div>
      <p className="mt-2 truncate text-[11px] text-muted-foreground" title={snapshot?.changesRoot || workspace?.project.rootPath}>Workspace changes · {panel.chrome.activeBranch || "Current checkout"} · {snapshot?.changesRoot || workspace?.project.rootPath}</p>
    </div>}
    <SessionTabStack>
      <SessionTabPane visible={!worktrees}>
        <div className={tool ? "grid h-full min-h-0 grid-cols-[minmax(220px,300px)_minmax(0,1fr)]" : "flex h-full min-h-0 flex-col"}>
          <div className={`min-h-0 overflow-hidden ${tool ? "border-r border-border/60" : "h-full"}`}><ChangesPanelSection {...props} /></div>
          {tool && <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            {tool === "files" ? <WorkspaceSessionPanelProvider value={workspaceSessionPanelProps}><WorkspaceEditor projectId={projectId} kind="files" active /></WorkspaceSessionPanelProvider>
              : view.reviewMode === "all" ? <FullDiffViewer changes={snapshot?.changes ?? []} resolvedTheme={panel.chrome.resolvedTheme} />
                : panel.chrome.selectedChange ? <DiffViewer change={panel.chrome.selectedChange} expanded resolvedTheme={panel.chrome.resolvedTheme} />
                  : <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">Select a changed file to review its diff.</div>}
          </div>}
        </div>
      </SessionTabPane>
      {workspace && worktrees && <SessionTabPane visible><WorkspaceWorktreesTool workspace={workspace} /></SessionTabPane>}
    </SessionTabStack>
    {!collapsed && !tool && <div role="separator" aria-label="Resize changes sidebar" aria-orientation="vertical"
      className={`absolute inset-y-0 z-20 w-1.5 cursor-col-resize bg-transparent transition hover:bg-border/60 ${swapped ? "right-0" : "left-0"}`} onPointerDown={onStartResize} />}
  </div>;
}
