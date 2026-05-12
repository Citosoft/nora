import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { WorkspaceSidebarBuildDeps } from "@/components/app/types/workspaceSidebarBuild.types";

type SignedInWorkspaceSidebarAssemblySlice = Pick<
  AppShellSignedInAssemblySources,
  "core" | "workspaceCatalog" | "workspaceContent" | "workspaceSidebarRest" | "chromeShell" | "sessionSurface"
>;

export const assembleSignedInWorkspaceSidebarBuild = (
  s: SignedInWorkspaceSidebarAssemblySlice
): WorkspaceSidebarBuildDeps => {
  const { core, workspaceCatalog, workspaceContent, workspaceSidebarRest, chromeShell, sessionSurface } = s;
  const { handleCreateAgentFromDialog: _omitAgentDialog, ...workspaceContentForSidebar } = workspaceContent;

  return {
    ...workspaceContentForSidebar,
    ...workspaceSidebarRest,
    focusWorkspaceWithRecovery: core.focusWorkspaceWithRecovery,
    openAddWorkspaceModal: chromeShell.openAddWorkspaceModal,
    openSettingsPage: core.openSettingsPage,
    resolveInstallCommand: core.resolveInstallCommand,
    safely: core.safely,
    activeProjectId: core.snapshot.project?.id ?? null,
    agentCatalog: core.snapshot.agentCatalog,
    uiCommands: {
      clearBrowserAndForgeFocus: core.uiCommands.clearBrowserAndForgeFocus,
      clearSessionTabFocus: core.uiCommands.clearSessionTabFocus,
      openCreateAgentDialog: core.uiCommands.openCreateAgentDialog,
      openCreateTerminalDialog: core.uiCommands.openCreateTerminalDialog,
      openResetWorkspacesDialog: core.uiCommands.openResetWorkspacesDialog,
      openWorkspaceTerminalPresetsDialog: core.uiCommands.openWorkspaceTerminalPresetsDialog,
      setDestroyAgentId: core.uiCommands.setDestroyAgentId,
      setInstallCommandDraft: core.uiCommands.setInstallCommandDraft
    },
    workspaceNotes: workspaceCatalog.allWorkspaceNotes,
    workspaceSpecs: workspaceCatalog.allWorkspaceSpecs,
    workspaceTasks: workspaceCatalog.allWorkspaceTasks,
    workspaceSidebarUiState: {
      aiChatTabs: core.uiState.aiChatTabs,
      focusedAiChatTabId: core.uiState.focusedAiChatTabId,
      focusedBrowserTabId: core.uiState.focusedBrowserTabId,
      focusedForgeViewerTabId: core.uiState.focusedForgeViewerTabId,
      installCommandDrafts: core.uiState.installCommandDrafts
    },
    terminalPresets: core.appSettings.terminalPresets,
    terminalQuickLaunchDefaults: core.appSettings.terminalQuickLaunchDefaults,
    activeWorkspaceContentTab: sessionSurface.activeWorkspaceContentTab,
    setWorkspaceSessionActiveViewId: sessionSurface.workspaceSessionViews.setActiveViewId
  };
};
