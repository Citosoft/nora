import { noraWorkspaceManagementClient } from "@/components/app/clients/noraWorkspaceManagementClient";
import type { AppChromeShellComposeSlice } from "@/components/app/types/appChromeShellComposeSlice.types";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";

type SignedInChromeShellAssemblySlice = Pick<AppShellSignedInAssemblySources, "core" | "sessionSurface" | "chromeShell" | "gitBranches">;

function getPathLeaf(pathValue: string | null | undefined): string | null {
  if (!pathValue) {
    return null;
  }
  const normalized = pathValue.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized) {
    return null;
  }
  const segments = normalized.split("/");
  return segments[segments.length - 1] || null;
}

export const assembleSignedInChromeShellComposeSlice = (s: SignedInChromeShellAssemblySlice): AppChromeShellComposeSlice => {
  const { core, sessionSurface, chromeShell, gitBranches } = s;
  const activeWorktreePath = core.snapshot.changesRoot || sessionSurface.focusedWorkspace?.project.rootPath || null;
  const activeWorkspaceWorktreeName = getPathLeaf(activeWorktreePath);

  return {
    titleBar: {
      activeSplitViewCollection: sessionSurface.activeSplitViewCollection,
      activeView: core.activeView,
      canOpenProjectInIde: chromeShell.canOpenProjectInIde,
      defaultIdeId: chromeShell.defaultIdeId,
      focusNextSessionTab: () => chromeShell.keyboardShortcutActions["focus-next-session-tab"](),
      focusPreviousSessionTab: () => chromeShell.keyboardShortcutActions["focus-previous-session-tab"](),
      handleOpenProjectInIde: chromeShell.handleOpenProjectInIde,
      handleOpenRecentWorkspace: chromeShell.handleOpenRecentWorkspace,
      handleSubmitIssue: chromeShell.handleSubmitIssue,
      hasActiveWorkspace: Boolean(core.snapshot.project),
      installedIdes: chromeShell.installedIdes,
      isChangesSidebarCollapsed: chromeShell.isChangesSidebarCollapsed,
      isLoadingInstalledIdes: chromeShell.isLoadingInstalledIdes,
      isWorkspaceSidebarCollapsed: chromeShell.isWorkspaceSidebarCollapsed,
      onAddRemoteWorkspace: core.openAddRemoteWorkspaceModal,
      onFocusLocalTerminalDock: () => {
        void chromeShell.focusLocalTerminalDock();
      },
      onOpenAbout: core.uiCommands.openAboutDialog,
      onOpenKeyboardShortcuts: core.uiCommands.openKeyboardShortcutsDialog,
      onToggleChangesSidebar: () => chromeShell.setIsChangesSidebarCollapsed((current) => !current),
      onToggleLocalTerminalDock: () => chromeShell.setIsLocalTerminalDockCollapsed((current) => !current),
      onToggleWorkspaceSidebar: () => chromeShell.setIsWorkspaceSidebarCollapsed((current) => !current),
      openAddWorkspace: () => {
        void chromeShell.openAddWorkspaceModal();
      },
      openCreateAgent: chromeShell.openCreateAgentModal,
      openCreateBrowser: chromeShell.openWorkspaceBrowserFromTitleBar,
      openCreateTerminal: chromeShell.openCreateTerminalModal,
      openStartupDependencies: chromeShell.openStartupDependenciesDialog,
      onCloseWorkspace: () => {
        void core.safely(() => noraWorkspaceManagementClient.closeWorkspace());
      },
      onOpenSettings: chromeShell.toggleSettingsPage,
      onRefreshWorkspace: () => {
        void core.safely(() => noraWorkspaceManagementClient.refreshWorkspace());
      },
      preferredIde: chromeShell.preferredIde,
      recentWorkspaces: core.snapshot.recentProjects,
      resolvedTheme: core.resolvedTheme,
      snapshotProject: core.snapshot.project,
      themeMode: chromeShell.themeMode,
      toggleTheme: chromeShell.toggleTheme,
      useMacTitleBarChrome: chromeShell.useMacTitleBarChrome,
      windowUiState: core.windowUiState,
      workspaceQuickSearch: core.snapshot.project
        ? {
            source: chromeShell.workspaceQuickSearchSource,
            openRequestId: chromeShell.workspaceQuickSearchRequestId,
            resolvedTheme: core.resolvedTheme,
            openShortcutLabel: chromeShell.workspaceQuickSearchOpenShortcutLabel,
            onPick: chromeShell.handleWorkspaceQuickSearchPick
          }
        : null,
      workspaceSessionViews: {
        activeViewId: sessionSurface.workspaceSessionViews.activeViewId,
        setActiveViewId: sessionSurface.workspaceSessionViews.setActiveViewId,
        createView: sessionSurface.workspaceSessionViews.createView
      }
    },
    topBanners: {
      autoUpdateStatus: chromeShell.autoUpdateStatus,
      isInstallingDownloadedUpdate: chromeShell.isInstallingDownloadedUpdate,
      onInstallDownloadedUpdate: chromeShell.handleInstallDownloadedUpdate,
      linuxUpdateStatus: chromeShell.linuxUpdateStatus,
      onCopyLinuxUpdateCommand: chromeShell.handleCopyLinuxUpdateCommand,
      onOpenLinuxRelease: chromeShell.handleOpenLinuxRelease,
      onDismissLinuxUpdate: chromeShell.dismissLinuxUpdateNotice
    },
    statusBarChrome: {
      entries: chromeShell.statusEntries,
      tools: core.snapshot.agentCatalog,
      agentSkillCatalogs: core.snapshot.agentSkillCatalogs,
      activeWorkspaceBranch: gitBranches.activeBranch || null,
      activeWorkspaceWorktreeName,
      onInstallTool: chromeShell.installStatusBarTool,
      onSwitchToolAccount: chromeShell.switchStatusBarToolAccount,
      onOpenSkillsSettings: () => core.openSettingsPage("skills")
    },
    settingsGroup: chromeShell.settingsGroup
  };
};
