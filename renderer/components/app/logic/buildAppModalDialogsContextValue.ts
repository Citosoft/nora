import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { noraRemoteWorkspaceClient } from "@/components/app/clients/noraRemoteWorkspaceClient";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { noraWorkspaceManagementClient } from "@/components/app/clients/noraWorkspaceManagementClient";
import type { AppModalDialogsContextValue } from "@/components/app/types/appModalDialogs.types";
import type { AppModalDialogsBuildDeps } from "@/components/app/types/appModalDialogsBuild.types";
import type { ConnectRemoteProjectPayload } from "@shared/appTypes";

export const copyForgeOAuthDeviceCode = async (code: string): Promise<void> => {
  const fallbackCopyWithTextarea = (): void => {
    const textarea = document.createElement("textarea");
    textarea.value = code;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, code.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!copied) {
      throw new Error("Clipboard copy command failed.");
    }
  };

  await Promise.resolve()
    .then(() => noraSystemClient.copyText(code))
    .catch(async () => {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        return;
      }
      fallbackCopyWithTextarea();
    });
};

export const buildAppModalDialogsContextValue = (d: AppModalDialogsBuildDeps): AppModalDialogsContextValue => ({
  createAgent: {
    open: d.uiState.showCreateAgentModal,
    project: d.snapshot.project,
    tools: d.snapshot.agentCatalog,
    agentSkillCatalogs: d.snapshot.agentSkillCatalogs,
    workspaceTasks: d.snapshot.project ? (d.workspaceTasks[d.snapshot.project.id]?.tasks ?? []) : [],
    worktrees: d.snapshot.worktrees,
    projectBranches: d.snapshot.projectBranches,
    activeBranch: d.parentRepoBranch,
    defaultLaunchTargetMode: d.appSettings.defaultAgentLaunchTarget,
    defaultWorktreePrepareCommand: d.snapshot.defaultWorktreePrepareCommand,
    preferredAgentToolId: d.appSettings.preferredAgentToolId,
    defaults: d.uiState.createAgentDefaults,
    workspaceTerminalPresets: d.snapshot.project?.workspaceTerminalPresets ?? [],
    globalTerminalPresets: d.appSettings.terminalPresets,
    onOpenChange: d.uiCommands.setCreateAgentDialogOpen,
    onCreateAgent: (payload, taskPath) => {
      d.uiCommands.closeCreateAgentDialog();
      void d.handleCreateAgentFromDialog(payload, taskPath);
    }
  },
  destroyAgent: {
    agent: d.agentPendingDestroy,
    open: d.uiState.destroyAgentId !== null,
    onOpenChange: d.uiCommands.setDestroyAgentDialogOpen,
    onConfirm: () =>
      d.agentPendingDestroy
        ? d.safely(() => noraAgentClient.destroyAgent(d.agentPendingDestroy!.id)).then((next) => {
            if (next) {
              d.uiCommands.setDestroyAgentId(null);
            }
          })
        : Promise.resolve()
  },
  error: {
    open: d.uiState.activeErrorMessage !== null,
    message: d.uiState.activeErrorMessage,
    onOpenChange: (open) => {
      if (!open) {
        d.clearCapturedError();
      }
    }
  },
  oauthDevice: {
    open: d.forgeOAuthDevicePrompt !== null,
    prompt: d.forgeOAuthDevicePrompt,
    onOpenChange: (open) => {
      if (!open) {
        d.setForgeOAuthDevicePrompt(null);
      }
    },
    onCopyCode: copyForgeOAuthDeviceCode,
    onOpenVerificationUrl: (url) => {
      void noraSystemClient.openExternalUrl(url);
    }
  },
  startupDependencies: {
    open: d.shouldShowStartupDependenciesDialog,
    dependencies: d.effectiveStartupDependencyReport?.dependencies ?? [],
    isLoading: d.isStartupDependencyDialogBusy,
    installTargetId: d.startupDependencyInstallTargetId,
    installErrorMessage: d.startupDependencyInstallErrorMessage,
    simulatedMissingDependencyIds: d.simulatedMissingDependencyIds,
    onOpenChange: d.handleStartupDependenciesDialogOpenChange,
    onInstallDependency: (dependencyId) => {
      void d.installStartupDependencyWithRefresh(dependencyId);
    },
    onCopyInstructions: d.copyStartupDependencyInstructions,
    onToggleSimulatedMissing: d.toggleSimulatedMissingDependency,
    onClearSimulation: d.clearSimulatedMissingDependencies,
    onReload: () => {
      void d.reloadStartupDependencyReport();
    },
    onQuit: () => {
      void noraSystemClient.closeWindow();
    }
  },
  removeMissingWorkspace: {
    projectRoot: d.uiState.removeMissingWorkspaceRoot,
    errorMessage: d.uiState.removeMissingWorkspaceError,
    open: d.uiState.removeMissingWorkspaceRoot !== null,
    onOpenChange: (open) =>
      d.setUiState((current) => ({
        ...current,
        removeMissingWorkspaceRoot: open ? current.removeMissingWorkspaceRoot : null,
        removeMissingWorkspaceError: open ? current.removeMissingWorkspaceError : null
      })),
    onConfirm: () => {
      const projectRoot = d.uiState.removeMissingWorkspaceRoot;
      if (!projectRoot) {
        return Promise.resolve();
      }

      return d
        .safely(() => noraWorkspaceManagementClient.removeWorkspace(projectRoot))
        .then(() => {
          d.setUiState((current) => ({
            ...current,
            removeMissingWorkspaceRoot: null,
            removeMissingWorkspaceError: null
          }));
        })
        .then(() => undefined);
    }
  },
  resetWorkspaces: {
    open: d.uiState.showResetWorkspacesDialog,
    onOpenChange: d.uiCommands.setResetWorkspacesDialogOpen,
    onConfirm: () =>
      d.safely(() => noraWorkspaceManagementClient.resetWorkspaceList()).then(() => {
        d.uiCommands.setResetWorkspacesDialogOpen(false);
      }).then(() => undefined)
  },
  workspaceTerminalPresets: {
    open: d.uiState.workspaceTerminalPresetsProjectId !== null,
    project: d.workspaceTerminalPresetProject,
    terminalShells: d.snapshot.terminalShells,
    onOpenChange: d.uiCommands.setWorkspaceTerminalPresetsDialogOpen,
    onChange: (presets) =>
      d.workspaceTerminalPresetProject
        ? d.saveWorkspaceTerminalPresets(d.workspaceTerminalPresetProject.id, presets)
        : Promise.resolve()
  },
  createTerminal: {
    open: d.uiState.showCreateTerminalModal,
    project: d.snapshot.project,
    worktrees: d.snapshot.worktrees,
    terminalShells: d.snapshot.terminalShells,
    activeBranch: d.activeBranch,
    defaults: d.uiState.createTerminalDefaults,
    onOpenChange: d.uiCommands.setCreateTerminalDialogOpen,
    onCreateTerminal: (payload) => {
      d.uiCommands.closeCreateTerminalDialog();
      void d.createTerminalWithStatus(payload);
    }
  },
  createPullRequest: {
    open: d.isCreatePullRequestDialogOpen,
    provider: d.forgeOverview?.repo?.provider ?? null,
    sourceBranch: d.activeBranch,
    baseBranch: d.snapshot.project?.baseBranch || d.snapshot.projectBranches[0] || "",
    availableBranches: d.snapshot.projectBranches.length
      ? d.snapshot.projectBranches
      : d.snapshot.project?.baseBranch
        ? [d.snapshot.project.baseBranch]
        : [],
    onOpenChange: d.setIsCreatePullRequestDialogOpen,
    onCreate: d.handleCreateForgePullRequest
  },
  addWorkspace: {
    open: d.uiState.showAddWorkspaceModal,
    onOpenChange: d.uiCommands.setAddWorkspaceDialogOpen,
    onChooseLocal: () => {
      void d.handleChooseLocalWorkspace();
    },
    onChooseRemote: d.openAddRemoteWorkspaceModal
  },
  remoteWorkspace: {
    open: d.uiState.showRemoteWorkspaceModal,
    onOpenChange: d.uiCommands.setRemoteWorkspaceDialogOpen,
    onConnect: async (payload: ConnectRemoteProjectPayload) => {
      d.setUiState((current) => ({
        ...current,
        showAddWorkspaceModal: false,
        showRemoteWorkspaceModal: false
      }));
      try {
        const next = d.normalizeSnapshot(await noraRemoteWorkspaceClient.openRemoteWorkspace(payload));
        d.setUiState((current) => ({
          ...current,
          activeErrorMessage: next.errorMessage || current.activeErrorMessage,
          snapshot: next
        }));
      } catch (error) {
        d.dismissWorkspaceLoading();
        throw error;
      }
    }
  },
  linuxAptSetup: {
    open: d.isLinuxAptSetupDialogOpen,
    status: d.linuxAptSetupStatus,
    isInstalling: d.isInstallingLinuxAptUpdates,
    errorMessage: d.linuxAptSetupErrorMessage,
    onOpenChange: (open) => {
      if (!open) {
        d.closeLinuxAptSetupDialog();
      }
    },
    onEnable: d.installLinuxAptUpdates,
    onCopyManualCommands: d.handleCopyLinuxAptManualCommands
  },
  browserCookieImport: {
    open: d.isBrowserCookieImportPromptOpen,
    profiles: d.chromeCookieProfiles,
    selectedProfileId: d.selectedChromeCookieProfileId,
    isLoadingProfiles: d.isLoadingChromeCookieProfiles,
    isImporting: d.isImportingChromeBrowserData,
    onOpenChange: (open) => {
      d.setIsBrowserCookieImportPromptOpen(open);
      if (!open) {
        void d.updateBrowserPreferences({
          browserDataImportPromptSeen: true
        }).catch(d.captureError);
      }
    },
    onSelectedProfileIdChange: d.setSelectedChromeCookieProfileId,
    onReloadProfiles: d.loadChromeCookieProfiles,
    onImport: (profileId) => {
      void d.runChromeBrowserDataImport(profileId).then((result) => {
        if (!result) {
          return;
        }
        if (result.ok) {
          d.setIsBrowserCookieImportPromptOpen(false);
        }
      });
    },
    onSkip: () => {
      d.setIsBrowserCookieImportPromptOpen(false);
      void d.updateBrowserPreferences({
        browserDataImportPromptSeen: true
      }).catch(d.captureError);
    }
  },
  analyticsConsent: {
    open: d.isAnalyticsConsentDialogOpen,
    onAllow: d.allowAnalyticsConsent,
    onDecline: d.declineAnalyticsConsent
  },
  about: {
    open: d.uiState.showAboutDialog,
    onOpenChange: d.uiCommands.setAboutDialogOpen,
    focusLocalTerminalDock: d.focusLocalTerminalDock
  },
  keyboardShortcuts: {
    open: d.uiState.showKeyboardShortcutsDialog,
    onOpenChange: d.uiCommands.setKeyboardShortcutsDialogOpen,
    platform: d.windowUiStatePlatform
  },
  workspaceSwitcher: {
    open: d.uiState.showWorkspaceSwitcherDialog,
    onOpenChange: d.uiCommands.setWorkspaceSwitcherDialogOpen,
    workspaces: d.workspaceSwitcherEntries,
    activeWorkspaceId: d.snapshot.project?.id || null,
    onSelectWorkspace: (projectId) => {
      d.setActiveView("main");
      void d.focusWorkspaceWithRecovery(projectId);
    }
  }
});
