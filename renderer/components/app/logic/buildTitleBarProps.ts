import type { TitleBarProps } from "@/components/app/types/chromeDialog.types";
import type { TitleBarBuildDeps } from "@/components/app/types/titleBarBuild.types";

export const buildTitleBarProps = (d: TitleBarBuildDeps): TitleBarProps => ({
  windowUiState: d.windowUiState,
  useMacTitleBarChrome: d.useMacTitleBarChrome,
  themeMode: d.themeMode,
  resolvedTheme: d.resolvedTheme,
  onToggleTheme: d.toggleTheme,
  onOpenSettings: d.onOpenSettings,
  settingsActive: d.activeView === "settings",
  onOpenKeyboardShortcuts: d.onOpenKeyboardShortcuts,
  onOpenAbout: d.onOpenAbout,
  onSubmitIssue: d.handleSubmitIssue,
  canOpenProjectInIde: d.canOpenProjectInIde,
  installedIdes: d.installedIdes,
  isLoadingInstalledIdes: d.isLoadingInstalledIdes,
  preferredIde: d.preferredIde,
  defaultIdeId: d.defaultIdeId,
  onOpenProjectInIde: d.handleOpenProjectInIde,
  isWorkspaceSidebarCollapsed: d.isWorkspaceSidebarCollapsed,
  sidebarsSwapped: d.sidebarsSwapped,
  onToggleWorkspaceSidebar: d.onToggleWorkspaceSidebar,
  onAddWorkspace: d.openAddWorkspace,
  onAddRemoteWorkspace: d.onAddRemoteWorkspace,
  onCloseWorkspace: d.onCloseWorkspace,
  onRefreshWorkspace: d.onRefreshWorkspace,
  onCreateTerminal: d.openCreateTerminal,
  onCreateAgent: d.openCreateAgent,
  onCreateBrowser: d.openCreateBrowser,
  recentWorkspaces: d.recentWorkspaces,
  onOpenRecentWorkspace: (projectRoot, projectName) => {
    void d.handleOpenRecentWorkspace(projectRoot, projectName);
  },
  hasActiveWorkspace: d.hasActiveWorkspace,
  isChangesSidebarCollapsed: d.isChangesSidebarCollapsed,
  onToggleChangesSidebar: d.onToggleChangesSidebar,
  onToggleLocalTerminalDock: d.onToggleLocalTerminalDock,
  onFocusLocalTerminalDock: d.onFocusLocalTerminalDock,
  onFocusPreviousSessionTab: d.focusPreviousSessionTab,
  onFocusNextSessionTab: d.focusNextSessionTab,
  onOpenStartupDependencies: d.openStartupDependencies,
  splitViewSelection: d.snapshotProject
    ? {
        views: d.activeSplitViewCollection.views.map((view) => ({
          id: view.id,
          name: view.name
        })),
        activeViewId: d.workspaceSessionViews.activeViewId,
        onActiveViewChange: d.workspaceSessionViews.setActiveViewId,
        onCreateView: () => {
          void d.workspaceSessionViews.createView();
        }
      }
    : null,
  workspaceQuickSearch: d.workspaceQuickSearch
});
