import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { ChangesPanelSection } from "@/components/app/panels/ChangesPanelSection";
import { WorkspaceToolHeader } from "@/components/app/panels/workspace-tools/WorkspaceToolHeader";
import type { WorkspaceChangesSurfaceProps } from "@/components/app/types/workspaceNavigation.types";

/** Grid placement moves one panel instance so commit and search drafts survive tool navigation. */
export function WorkspaceChangesSurface({ panel, collapsed, swapped, onStartResize }: WorkspaceChangesSurfaceProps) {
  const { route, closeTool, openTool } = useWorkspaceNavigation();
  const snapshot = useCanonicalAppSnapshot();
  const tool = route?.tool === "files" || route?.tool === "changes" ? route.tool : null;
  const props = tool ? { ...panel,
    chrome: { ...panel.chrome, collapsed: false, activeTab: tool === "files" ? "files" as const : "git" as const,
      onActiveTabChange: (tab: typeof panel.chrome.activeTab) => {
        if (route && (tab === "files" || tab === "git")) openTool(route.projectId, tab === "files" ? "files" : "changes");
        else { closeTool(); panel.chrome.onActiveTabChange(tab); }
      },
      onSelectChange: async (path: string) => { closeTool(); await panel.chrome.onSelectChange(path); },
      onEditChange: (path: string) => { closeTool(); panel.chrome.onEditChange(path); },
      onOpenFullDiff: () => { closeTool(); panel.chrome.onOpenFullDiff(); } },
    fileHandlers: { ...panel.fileHandlers, openFileEditor: (...args: Parameters<typeof panel.fileHandlers.openFileEditor>) => { closeTool(); return panel.fileHandlers.openFileEditor(...args); } }
  } : panel;
  return <div className={tool ? "relative z-30 flex min-h-0 min-w-0 flex-col overflow-hidden bg-background" : collapsed ? "invisible min-h-0 overflow-hidden" : "relative min-h-0 min-w-0"} style={{ gridColumn: tool ? 2 : swapped ? 1 : 3, gridRow: 1 }}>
    {tool && <WorkspaceToolHeader title={tool === "files" ? "Files" : "Changes"} workspaceName={snapshot?.project?.name ?? "Workspace"} />}
    <div className="h-full min-h-0 flex-1"><ChangesPanelSection {...props} /></div>
    {!collapsed && !tool && <div role="separator" aria-label="Resize changes sidebar" aria-orientation="vertical"
      className={`absolute inset-y-0 z-20 w-1.5 cursor-col-resize bg-transparent transition hover:bg-border/60 ${swapped ? "right-0" : "left-0"}`} onPointerDown={onStartResize} />}
  </div>;
}
