import { WorkspaceSessionLoadingOverlay } from "@/components/app/chrome/WorkspaceSessionLoadingOverlay";
import { AppMainCenterContentProvider } from "@/components/app/context/appMainCenterContentContext";
import { useAppSignedInWorkspaceView } from "@/components/app/context/appSignedInWorkspaceViewContext";
import { LocalTerminalDockProvider } from "@/components/app/context/localTerminalDockContext";
import { WorkspaceRuntimeProvider } from "@/components/app/context/workspaceRuntimeContext";
import { WorkspaceSidebarProvider } from "@/components/app/context/workspaceSidebarContext";
import { ChangesPanelSection } from "@/components/app/panels/ChangesPanelSection";
import { LocalTerminalDock as AppLocalTerminalDock } from "@/components/app/panels/LocalTerminalDock";
import { WorkspaceSidebar as AppWorkspaceSidebar } from "@/components/app/sidebar/WorkspaceSidebar";
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
    <div className="relative min-h-0">
      <WorkspaceSidebarProvider value={workspaceSidebarContextValue}>
        <AppWorkspaceSidebar />
      </WorkspaceSidebarProvider>
      {!isWorkspaceSidebarCollapsed ? (
        <div
          role="separator"
          aria-label="Resize workspace sidebar"
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

  const changesSidebarCell = hasActiveWorkspace ? (
    <div className="relative min-h-0">
      <ChangesPanelSection {...changesPanelSectionProps} />
      {!isChangesSidebarCollapsed ? (
        <div
          role="separator"
          aria-label="Resize changes sidebar"
          aria-orientation="vertical"
          className={[
            "absolute inset-y-0 z-20 w-1.5 cursor-col-resize bg-transparent transition hover:bg-border/60",
            areSidebarsSwapped ? "right-0" : "left-0"
          ].join(" ")}
          onPointerDown={onStartChangesSidebarResize}
        />
      ) : null}
    </div>
  ) : (
    <div className="min-h-0" aria-hidden />
  );

  const centerColumnCell = (
    <div className="center-column-host relative flex min-h-0 min-w-0 flex-col overflow-hidden border-x border-border/70 bg-background">
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
    <WorkspaceRuntimeProvider value={workspaceRuntimeValue}>
      <div
        className="grid h-full min-h-0"
        style={{
          gridTemplateColumns
        }}
      >
        {areSidebarsSwapped ? (
          <>
            {changesSidebarCell}
            {centerColumnCell}
            {workspaceSidebarCell}
          </>
        ) : (
          <>
            {workspaceSidebarCell}
            {centerColumnCell}
            {changesSidebarCell}
          </>
        )}
      </div>
    </WorkspaceRuntimeProvider>
  );
}
