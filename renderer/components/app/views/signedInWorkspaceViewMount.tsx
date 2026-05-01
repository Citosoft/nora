import { COLLAPSED_SIDEBAR_WIDTH } from "@/components/app/constants/uiLayout";
import { useAppShellLayoutSlice } from "@/components/app/context/appShellBuildContexts";
import { AppSignedInWorkspaceViewProvider } from "@/components/app/context/appSignedInWorkspaceViewContext";
import { useAppCenterContentValue } from "@/components/app/hooks/useAppCenterContentValue";
import { useSessionCenterPorts } from "@/components/app/hooks/useSessionCenterPorts";
import { useChangesPanelSectionValue } from "@/components/app/hooks/useChangesPanelSectionValue";
import { useWorkspaceSidebarValue } from "@/components/app/hooks/useWorkspaceSidebarValue";
import { AppSignedInWorkspaceView } from "@/components/app/views/AppSignedInWorkspaceView";
import { useMemo, type PointerEvent, type ReactElement } from "react";

/**
 * Builds the signed-in workspace provider subtree from existing shell contexts and
 * center/sidebar/changes derived values — keeps that wiring out of the chrome tree.
 */
export function useSignedInWorkspaceViewMount(): ReactElement | null {
  const layout = useAppShellLayoutSlice();
  const sessionCenter = useSessionCenterPorts();
  const workspaceSidebarContextValue = useWorkspaceSidebarValue();
  const changesPanelSectionProps = useChangesPanelSectionValue();
  const appMainCenterContentValue = useAppCenterContentValue();

  return useMemo(() => {
    if (!layout.workspaceRuntimeValue) {
      return null;
    }

    const workspaceTrack = layout.isWorkspaceSidebarCollapsed
      ? `${COLLAPSED_SIDEBAR_WIDTH}px`
      : `${layout.workspaceSidebarWidth}px`;
    const changesTrack = layout.hasActiveWorkspace
      ? layout.isChangesSidebarCollapsed
        ? `${COLLAPSED_SIDEBAR_WIDTH}px`
        : `${layout.changesSidebarWidth}px`
      : "0px";
    const gridTemplateColumns = layout.sidebarsSwapped
      ? `${changesTrack} minmax(0, 1fr) ${workspaceTrack}`
      : `${workspaceTrack} minmax(0, 1fr) ${changesTrack}`;

    const value = {
      workspaceRuntimeValue: layout.workspaceRuntimeValue,
      gridTemplateColumns,
      areSidebarsSwapped: layout.sidebarsSwapped,
      workspaceSidebarContextValue,
      isWorkspaceSidebarCollapsed: layout.isWorkspaceSidebarCollapsed,
      onStartWorkspaceSidebarResize: (event: PointerEvent<HTMLDivElement>) =>
        layout.startSidebarResize("left", event),
      appMainCenterContentValue,
      localTerminalDockProps: {
        terminal: layout.localTerminalState,
        resolvedTheme: sessionCenter.resolvedTheme,
        terminalThemeId: sessionCenter.terminalThemeId,
        terminalFontId: sessionCenter.terminalFontId,
        height: layout.localTerminalDockHeight,
        isCollapsed: layout.isLocalTerminalDockCollapsed,
        isCreating: layout.isCreatingLocalTerminal,
        focusVersion: layout.localTerminalDockFocusVersion,
        onHeightChange: layout.setLocalTerminalDockHeight,
        onToggleCollapsed: () => layout.setIsLocalTerminalDockCollapsed((current) => !current)
      },
      workspaceSessionLoadingOverlayProps: {
        workspaceLoading: layout.workspaceLoading,
        isAddingWorkspace: layout.isAddingWorkspace,
        appClosingState: layout.appClosingState,
        onDismissWorkspaceLoading: layout.dismissWorkspaceLoading
      },
      hasActiveWorkspace: layout.hasActiveWorkspace,
      changesPanelSectionProps,
      isChangesSidebarCollapsed: layout.isChangesSidebarCollapsed,
      onStartChangesSidebarResize: (event: PointerEvent<HTMLDivElement>) =>
        layout.startSidebarResize("right", event)
    };

    return (
      <AppSignedInWorkspaceViewProvider value={value}>
        <AppSignedInWorkspaceView />
      </AppSignedInWorkspaceViewProvider>
    );
  }, [
    appMainCenterContentValue,
    sessionCenter.resolvedTheme,
    sessionCenter.terminalFontId,
    sessionCenter.terminalThemeId,
    changesPanelSectionProps,
    layout.appClosingState,
    layout.changesSidebarWidth,
    layout.dismissWorkspaceLoading,
    layout.hasActiveWorkspace,
    layout.isChangesSidebarCollapsed,
    layout.isCreatingLocalTerminal,
    layout.isLocalTerminalDockCollapsed,
    layout.isWorkspaceSidebarCollapsed,
    layout.sidebarsSwapped,
    layout.localTerminalDockFocusVersion,
    layout.localTerminalDockHeight,
    layout.localTerminalState,
    layout.setIsLocalTerminalDockCollapsed,
    layout.setLocalTerminalDockHeight,
    layout.startSidebarResize,
    layout.workspaceLoading,
    layout.workspaceRuntimeValue,
    layout.workspaceSidebarWidth,
    workspaceSidebarContextValue
  ]);
}
