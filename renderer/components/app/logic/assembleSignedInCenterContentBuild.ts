import type { AppCenterContentValueArgs } from "@/components/app/types/appCenterContentValue.types";
import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";

type SignedInCenterContentAssemblySlice = Pick<
  AppShellSignedInAssemblySources,
  | "core"
  | "workspaceCatalog"
  | "workspaceContent"
  | "chromeShell"
  | "sessionSurface"
  | "centerTabs"
  | "forge"
  | "aiModels"
>;

export const assembleSignedInCenterContentBuild = (s: SignedInCenterContentAssemblySlice): AppCenterContentValueArgs => {
  const { core, workspaceCatalog, workspaceContent, chromeShell, sessionSurface, centerTabs, forge, aiModels } = s;
  const { handleCreateAgentFromDialog, ...workspaceContentForCenter } = workspaceContent;
  void handleCreateAgentFromDialog;
  const { handleCreateForgePullRequest, ...forgeForCenter } = forge;
  void handleCreateForgePullRequest;

  return {
    ...workspaceContentForCenter,
    resolvedTheme: core.resolvedTheme,
    workspaceTasks: workspaceCatalog.workspaceTasks,
    workspaceSpecs: workspaceCatalog.workspaceSpecs,
    workspaceNotes: workspaceCatalog.workspaceNotes,
    workspaceTaskBoards: workspaceCatalog.workspaceTaskBoards,
    updateWorkspaceTaskBoard: workspaceCatalog.updateWorkspaceTaskBoard,
    focusWorkspaceWithRecovery: core.focusWorkspaceWithRecovery,
    openAddWorkspaceModal: chromeShell.openAddWorkspaceModal,
    resolveInstallCommand: core.resolveInstallCommand,
    safely: core.safely,
    uiState: core.uiState,
    uiCommands: {
      clearSessionTabFocus: core.uiCommands.clearSessionTabFocus,
      openCreateAgentDialog: core.uiCommands.openCreateAgentDialog,
      openCreateTerminalDialog: core.uiCommands.openCreateTerminalDialog,
      openWorkspaceSwitcherDialog: core.uiCommands.openWorkspaceSwitcherDialog,
      openWorkspaceTerminalPresetsDialog: core.uiCommands.openWorkspaceTerminalPresetsDialog,
      setDestroyAgentId: core.uiCommands.setDestroyAgentId,
      setInstallCommandDraft: core.uiCommands.setInstallCommandDraft
    },
    appSettings: core.appSettings,
    openSettingsPage: core.openSettingsPage,
    windowUiStatePlatform: core.windowUiState.platform,
    createTerminalWithStatus: core.createTerminalWithStatus,
    ...sessionSurface,
    ...centerTabs,
    ...forgeForCenter,
    ...aiModels
  };
};
