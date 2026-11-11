import { WorkspaceChangesSurface } from "@/components/app/panels/workspace-tools/WorkspaceChangesSurface";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { WorkspaceSessionLoadingOverlay } from "@/components/app/chrome/WorkspaceSessionLoadingOverlay";
import { AppMainCenterContentProvider } from "@/components/app/context/appMainCenterContentContext";
import { useAppSignedInWorkspaceView } from "@/components/app/context/appSignedInWorkspaceViewContext";
import { LocalTerminalDockProvider } from "@/components/app/context/localTerminalDockContext";
import { WorkspaceRuntimeProvider } from "@/components/app/context/workspaceRuntimeContext";
import { WorkspaceSidebarProvider } from "@/components/app/context/workspaceSidebarContext";
import { LocalTerminalDock as AppLocalTerminalDock } from "@/components/app/panels/LocalTerminalDock";
import { WorkspaceSidebar as AppWorkspaceSidebar } from "@/components/app/sidebar/WorkspaceSidebar";
import { AppMainCenterContent } from "@/components/app/views/AppMainCenterContent";

export function AppSignedInWorkspaceView() {
  const { route } = useWorkspaceNavigation();
  const filesTool = route?.tool === "files" || route?.tool === "changes" ? route.tool : null;
  const {
    workspaceRuntimeValue,
    gridTemplateColumns,
    areSidebarsSwapped,
    workspaceSidebarContextValue,
    isWorkspaceSidebarCollapsed,
    onStartWorkspaceSidebarResize,
    appMainCenterContentValue,
    localTerminalDockProps,
    workspaceSessionLoadingOverlayProps,
    hasActiveWorkspace,
    changesPanelSectionProps,
    isChangesSidebarCollapsed,
    onStartChangesSidebarResize
  } = useAppSignedInWorkspaceView();

  const workspaceSidebarCell = (
    <div className="relative min-h-0" style={{ gridColumn: areSidebarsSwapped ? 3 : 1, gridRow: 1 }}>
      <AppWorkspaceSidebar />
      {!isWorkspaceSidebarCollapsed ? (
        <div
          role="separator"
          aria-label="Resize projects sidebar"
          aria-orientation="vertical"
          className={[
            "absolute inset-y-0 z-20 w-1.5 cursor-col-resize bg-transparent transition hover:bg-border/60",
            areSidebarsSwapped ? "left-0" : "right-0"
          ].join(" ")}
          onPointerDown={onStartWorkspaceSidebarResize}
        />
      ) : null}
    </div>
  );

  // Stays mounted while collapsed (zero-width, invisible) so panel drafts like the commit message survive toggling.
  const changesSidebarCell = hasActiveWorkspace ? (
    <WorkspaceChangesSurface panel={changesPanelSectionProps} collapsed={isChangesSidebarCollapsed} swapped={areSidebarsSwapped} onStartResize={onStartChangesSidebarResize} />
  ) : (
    <div className="min-h-0" style={{ gridColumn: areSidebarsSwapped ? 1 : 3, gridRow: 1 }} aria-hidden />
  );

  const centerColumnCell = (
    <div data-changes-sidebar-open={hasActiveWorkspace && !isChangesSidebarCollapsed && !filesTool} inert={!!filesTool} aria-hidden={!!filesTool} style={{ gridColumn: 2, gridRow: 1 }} className="center-column-host relative flex min-h-0 min-w-0 flex-col overflow-hidden border-x border-border/70 bg-background">
      <div className="min-h-0 flex-1 overflow-hidden">
        <AppMainCenterContentProvider value={appMainCenterContentValue}>
          <AppMainCenterContent />
        </AppMainCenterContentProvider>
      </div>
      <LocalTerminalDockProvider value={localTerminalDockProps}>
        <AppLocalTerminalDock />
      </LocalTerminalDockProvider>
      <WorkspaceSessionLoadingOverlay {...workspaceSessionLoadingOverlayProps} />
    </div>
  );

  return (
    <WorkspaceSidebarProvider value={workspaceSidebarContextValue}>
    <WorkspaceRuntimeProvider value={workspaceRuntimeValue}>
      <div
        className="grid h-full min-h-0"
        style={{
          gridTemplateColumns
        }}
      >
        {workspaceSidebarCell}
        {centerColumnCell}
        {changesSidebarCell}
      </div>
    </WorkspaceRuntimeProvider>
    </WorkspaceSidebarProvider>
  );
}
