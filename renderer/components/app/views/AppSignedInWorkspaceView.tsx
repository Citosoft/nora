import { ChangesPanelSection } from "@/components/app/panels/ChangesPanelSection";
import { WorkspaceSessionLoadingOverlay } from "@/components/app/chrome/WorkspaceSessionLoadingOverlay";
import { AppMainCenterContentProvider } from "@/components/app/context/appMainCenterContentContext";
import { useAppSignedInWorkspaceView } from "@/components/app/context/appSignedInWorkspaceViewContext";
import { LocalTerminalDockProvider } from "@/components/app/context/localTerminalDockContext";
import { WorkspaceRuntimeProvider } from "@/components/app/context/workspaceRuntimeContext";
import { WorkspaceSidebarProvider } from "@/components/app/context/workspaceSidebarContext";
import { LocalTerminalDock as AppLocalTerminalDock } from "@/components/app/panels/LocalTerminalDock";
import { WorkspaceSidebar as AppWorkspaceSidebar } from "@/components/app/sidebar/WorkspaceSidebar";
import { SidebarModeStrip } from "@/components/app/sidebar/SidebarModeStrip";
import { AppMainCenterContent } from "@/components/app/views/AppMainCenterContent";

export function AppSignedInWorkspaceView() {
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
    <div className={`flex min-h-0 ${areSidebarsSwapped ? "flex-row-reverse" : ""}`} style={{ gridColumn: areSidebarsSwapped ? 3 : 1, gridRow: 1 }}>
      <SidebarModeStrip edge={areSidebarsSwapped ? "right" : "left"} />
      <div className="relative min-h-0 min-w-0 flex-1">
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
    </div>
  );

  // Stays mounted while collapsed (zero-width, invisible) so panel drafts like the commit message survive toggling.
  const changesSidebarCell = hasActiveWorkspace ? (
    <div className={isChangesSidebarCollapsed ? "invisible min-h-0 overflow-hidden" : "relative flex min-h-0 min-w-0 flex-col"} style={{ gridColumn: areSidebarsSwapped ? 1 : 3, gridRow: 1 }}>
      <ChangesPanelSection {...changesPanelSectionProps} />
      {!isChangesSidebarCollapsed && <div role="separator" aria-label="Resize changes sidebar" aria-orientation="vertical"
        className={`absolute inset-y-0 z-20 w-1.5 cursor-col-resize bg-transparent transition hover:bg-border/60 ${areSidebarsSwapped ? "right-0" : "left-0"}`} onPointerDown={onStartChangesSidebarResize} />}
    </div>
  ) : (
    <div className="min-h-0" style={{ gridColumn: areSidebarsSwapped ? 1 : 3, gridRow: 1 }} aria-hidden />
  );

  const centerColumnCell = (
    <div data-changes-sidebar-open={hasActiveWorkspace && !isChangesSidebarCollapsed} style={{ gridColumn: 2, gridRow: 1 }} className="center-column-host relative flex min-h-0 min-w-0 flex-col overflow-hidden border-x border-border/70 bg-background">
      <div className="min-h-0 flex-1 overflow-hidden">
        <AppMainCenterContent />
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
    <AppMainCenterContentProvider value={appMainCenterContentValue}>
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
    </AppMainCenterContentProvider>
    </WorkspaceRuntimeProvider>
    </WorkspaceSidebarProvider>
  );
}
