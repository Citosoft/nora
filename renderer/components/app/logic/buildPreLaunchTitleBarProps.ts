import { noraWorkspaceManagementClient } from "@/components/app/clients/noraWorkspaceManagementClient";
import { createQuickTerminalDialogDefaults } from "@/components/app/logic/terminalQuickLaunch";
import type {
  CommonPreLaunchTitleBarInput,
  PreLaunchOnboardingTitleBarWorkspaceInput
} from "@/components/app/types/appPreLaunchTitleBar.types";
import type { TitleBarProps } from "@/components/app/types/chromeDialog.types";

const noop = (): void => undefined;

export const buildPreLaunchTitleBarLoadingProps = (
  common: CommonPreLaunchTitleBarInput,
  settingsActive: boolean
): TitleBarProps => ({
  ...common,
  settingsActive,
  canOpenProjectInIde: false,
  preferredIde: null,
  onOpenProjectInIde: noop,
  isWorkspaceSidebarCollapsed: false,
  sidebarsSwapped: false,
  onToggleWorkspaceSidebar: noop,
  onCloseWorkspace: noop,
  onRefreshWorkspace: noop,
  onCreateTerminal: noop,
  onCreateAgent: noop,
  onCreateBrowser: noop,
  recentWorkspaces: [],
  onOpenRecentWorkspace: noop,
  hasActiveWorkspace: false,
  isChangesSidebarCollapsed: false,
  onToggleChangesSidebar: noop,
  onToggleLocalTerminalDock: noop,
  onFocusLocalTerminalDock: noop,
  onFocusPreviousSessionTab: noop,
  onFocusNextSessionTab: noop
});

export const buildPreLaunchTitleBarOnboardingProps = (
  common: CommonPreLaunchTitleBarInput,
  workspace: PreLaunchOnboardingTitleBarWorkspaceInput
): TitleBarProps => {
  const { snapshot } = workspace;
  return {
    ...common,
    settingsActive: false,
    canOpenProjectInIde: false,
    preferredIde: null,
    onOpenProjectInIde: noop,
    isWorkspaceSidebarCollapsed: false,
    sidebarsSwapped: false,
    onToggleWorkspaceSidebar: noop,
    onCloseWorkspace: () => {
      void workspace.safely(() => noraWorkspaceManagementClient.closeWorkspace());
    },
    onRefreshWorkspace: () => {
      void workspace.safely(() => noraWorkspaceManagementClient.refreshWorkspace());
    },
    onCreateTerminal: () => {
      if (!snapshot.project) {
        return;
      }

      workspace.setActiveView("main");
      workspace.uiCommands.openCreateTerminalDialog(
        createQuickTerminalDialogDefaults(
          workspace.defaultTerminalShellId,
          workspace.terminalQuickLaunchDefaults
        )
      );
    },
    onCreateAgent: () => {
      if (!snapshot.project) {
        return;
      }

      workspace.setActiveView("main");
      workspace.uiCommands.openCreateAgentDialog();
    },
    onCreateBrowser: () => {
      if (!snapshot.project) {
        return;
      }

      workspace.handleOpenWorkspaceBrowser(snapshot.project.id);
    },
    recentWorkspaces: snapshot.recentProjects,
    onOpenRecentWorkspace: (projectRoot, projectName) => {
      void workspace.handleOpenRecentWorkspace(projectRoot, projectName);
    },
    hasActiveWorkspace: Boolean(snapshot.project),
    isChangesSidebarCollapsed: false,
    onToggleChangesSidebar: noop,
    onToggleLocalTerminalDock: () => workspace.setIsLocalTerminalDockCollapsed((current) => !current),
    onFocusLocalTerminalDock: () => {
      void workspace.focusLocalTerminalDock();
    },
    onFocusPreviousSessionTab: workspace.focusPreviousSessionTab,
    onFocusNextSessionTab: workspace.focusNextSessionTab
  };
};
