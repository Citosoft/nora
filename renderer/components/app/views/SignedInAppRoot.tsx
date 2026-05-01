import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { noraToolingClient } from "@/components/app/clients/noraToolingClient";
import { useAppRootDialogs } from "@/components/app/context/appRootDialogsContext";
import {
  AppRootWorkspaceSessionProvider,
  useAppRootWorkspaceSession
} from "@/components/app/context/appRootWorkspaceSessionContext";
import { useAppRootShellState } from "@/components/app/context/appRootShellStateContext";
import { useAppRootState } from "@/components/app/context/appRootStateContext";
import { useAgentAttention } from "@/components/app/hooks/useAgentAttention";
import { useAgentCreationAnalytics } from "@/components/app/hooks/useAgentCreationAnalytics";
import { useAppRootChromeShellSources } from "@/components/app/hooks/useAppRootChromeShellSources";
import { useAppRootForgeViewerWorkItemDetailEffect } from "@/components/app/hooks/useAppRootForgeViewerWorkItemDetailEffect";
import { useAppRootModalExtrasSources } from "@/components/app/hooks/useAppRootModalExtrasSources";
import { useAppRootSettingsRuntimeAssemblyInput } from "@/components/app/hooks/useAppRootSettingsRuntimeAssemblyInput";
import { useAppRootSignedInProviderSlices } from "@/components/app/hooks/useAppRootSignedInProviderSlices";
import { useAppRootWorkspaceSidebarSources } from "@/components/app/hooks/useAppRootWorkspaceSidebarSources";
import { useAppRuntimeEffects } from "@/components/app/hooks/useAppRuntimeEffects";
import { useForgeActionHandlers } from "@/components/app/hooks/useForgeActionHandlers";
import { useForgeIntegration } from "@/components/app/hooks/useForgeIntegration";
import { useKeyboardShortcuts } from "@/components/app/hooks/useKeyboardShortcuts";
import { useVercelIntegration } from "@/components/app/hooks/useVercelIntegration";
import { useWorkspaceSessionFocusCommands } from "@/components/app/hooks/useWorkspaceSessionFocusCommands";
import { getWorkspacePresenceSignature } from "@/components/app/logic/appPresenceSignatures";
import { buildAppRootSignedInProviderSlicesWiringInput } from "@/components/app/logic/buildAppRootSignedInProviderSlicesWiringInput";
import { buildKeyboardShortcutActions } from "@/components/app/logic/buildKeyboardShortcutActions";
import { SHORTCUT_DEFINITIONS } from "@/components/app/logic/keyboardShortcuts";
import { getWorkspaceSwitcherEntries } from "@/components/app/logic/appUtils";
import type { SignedInAppRootProps } from "@/components/app/types/signedInAppRoot.types";
import type { AppRootSignedInProviderSlicesWiringInput } from "@/components/app/types/appRootSignedInProviderSlicesWiring.types";
import { AppRootOrchestratedTree } from "@/components/app/views/AppRootOrchestratedTree";
import { SignedInShellComposition } from "@/components/app/views/signedInShellComposition";
import { ToastProvider } from "@/components/ui/toast";
import { useCallback, useMemo, useRef, type ReactElement } from "react";

export function SignedInAppRoot(props: SignedInAppRootProps): ReactElement | null {
  const { snapshot } = useAppRootState();
  const { trackAgentCreation } = useAgentCreationAnalytics();

  if (!snapshot) {
    return null;
  }

  return (
    <AppRootWorkspaceSessionProvider
      appSettings={props.preferences.appSettings}
      storedWorkspaceContentState={props.storedWorkspaceContentState}
      safely={props.safely}
      safelyAndRefresh={props.snapshotCommands.safelyAndRefresh}
      runWithStatus={props.snapshotCommands.runWithStatus}
      updateSnapshotState={props.snapshotCommands.updateSnapshotState}
      focusWorkspaceWithRecovery={props.workspaceLoading.focusWorkspaceWithRecovery}
      captureError={props.captureError}
      openAiChat={props.centerTabs.openAiChat}
      uiCommands={props.uiCommands}
      normalizeSnapshot={props.normalizeSnapshot}
      windowPlatform={props.bootstrap.windowUiState.platform}
      setDefaultTerminalShellId={props.setDefaultTerminalShellId}
      installedIdes={props.bootstrap.installedIdes}
      defaultIdeId={props.preferences.defaultIdeId}
      statusBar={props.shellFrame.statusBar}
      trackAgentCreation={(payload, source) => {
        trackAgentCreation(payload, source);
      }}
    >
      <SignedInAppRootContent {...props} trackAgentCreation={trackAgentCreation} />
    </AppRootWorkspaceSessionProvider>
  );
}

function SignedInAppRootContent({
  trackAgentCreation,
  ...props
}: SignedInAppRootProps & {
  trackAgentCreation: ReturnType<typeof useAgentCreationAnalytics>["trackAgentCreation"];
}): ReactElement | null {
  const { uiState, setUiState, snapshot } = useAppRootState();
  const {
    activeWorkspaceContentTab,
    setActiveWorkspaceContentTab,
    activeView,
    setActiveView,
    settingsGroup,
    isAddingWorkspace,
    removingWorkspaceRoots,
    appClosingState,
    setAppClosingState,
    workspaceQuickSearchRequestId,
    setWorkspaceQuickSearchRequestId,
    activeChangesPanelTab,
    setActiveChangesPanelTab,
    changesSidebarWidth,
    collapsedWorkspaceIds,
    setCollapsedWorkspaceIds,
    isChangesSidebarCollapsed,
    setIsChangesSidebarCollapsed,
    isChatbotsSectionCollapsed,
    setIsChatbotsSectionCollapsed,
    isCliSectionCollapsed,
    setIsCliSectionCollapsed,
    isLocalTerminalDockCollapsed,
    setIsLocalTerminalDockCollapsed,
    isPortsSectionCollapsed,
    setIsPortsSectionCollapsed,
    isRemoteMountsSectionCollapsed,
    setIsRemoteMountsSectionCollapsed,
    isSkillsSectionCollapsed,
    setIsSkillsSectionCollapsed,
    isSpecsSectionCollapsed,
    setIsSpecsSectionCollapsed,
    isWorkspaceSidebarCollapsed,
    setIsWorkspaceSidebarCollapsed,
    localTerminalDockHeight,
    setLocalTerminalDockHeight,
    workspaceSidebarWidth,
    startSidebarResize,
    isCreatingLocalTerminal,
    localTerminalState,
    localTerminalDockFocusVersion,
    focusLocalTerminalDock,
    setLocalTerminalState,
    setIsCenterDiffExpanded,
    setIsCenterFullDiffExpanded,
    isCenterDiffExpanded,
    isCenterFullDiffExpanded
  } = useAppRootShellState();
  const dialogs = useAppRootDialogs();
  const {
    resources,
    sessionActions,
    layout,
    content,
    fileMutations,
    derived,
    mainSurface
  } = useAppRootWorkspaceSession();
  const canPreviewMacTitleBarChrome = !__NORA_IS_PRODUCTION__ && props.bootstrap.windowUiState.platform !== "darwin";
  const useMacTitleBarChrome =
    props.bootstrap.windowUiState.platform === "darwin" ||
    (canPreviewMacTitleBarChrome && props.preferences.forceMacTitleBarPreview);
  const sessionFocusCommands = useWorkspaceSessionFocusCommands({
    setUiState,
    normalizeSnapshot: props.normalizeSnapshot
  });
  const keyboardShortcutActions = useMemo(
    () =>
      buildKeyboardShortcutActions({
        activeWorkspaceContentTab,
        appSettingsTerminalQuickLaunchDefaults: props.preferences.appSettings.terminalQuickLaunchDefaults,
        createTerminalWithStatus: sessionActions.createTerminalWithStatus,
        defaultTerminalShellId: props.defaultTerminalShellId,
        fileEditorState: sessionActions.fileEditorState,
        focusLocalTerminalDock,
        handleOpenWorkspaceBrowser: props.centerTabs.handleOpenWorkspaceBrowser,
        isCenterDiffExpanded,
        openSettingsPage: props.navigation.openSettingsPage,
        openStartupDependenciesDialog: dialogs.openStartupDependenciesDialog,
        sessionFocusCommands,
        safely: props.safely,
        selectedChange: layout.selectedChange,
        setActiveView,
        setActiveWorkspaceContentTab,
        setFileEditorState: sessionActions.setFileEditorState,
        setIsCenterDiffExpanded,
        setIsChangesSidebarCollapsed,
        setIsLocalTerminalDockCollapsed,
        setIsWorkspaceSidebarCollapsed,
        setWorkspaceQuickSearchRequestId,
        snapshot,
        uiCommands: {
          openAddWorkspaceDialog: props.uiCommands.openAddWorkspaceDialog,
          openCreateAgentDialog: props.uiCommands.openCreateAgentDialog,
          openCreateTerminalDialog: props.uiCommands.openCreateTerminalDialog,
          openKeyboardShortcutsDialog: props.uiCommands.openKeyboardShortcutsDialog,
          openWorkspaceSwitcherDialog: props.uiCommands.openWorkspaceSwitcherDialog
        },
        uiState: {
          aiChatTabs: uiState.aiChatTabs,
          browserTabs: uiState.browserTabs,
          focusedAiChatTabId: uiState.focusedAiChatTabId,
          focusedBrowserTabId: uiState.focusedBrowserTabId,
          focusedForgeViewerTabId: uiState.focusedForgeViewerTabId,
          forgeViewerTabs: uiState.forgeViewerTabs
        }
      }),
    [
      activeWorkspaceContentTab,
      props.preferences.appSettings.terminalQuickLaunchDefaults,
      sessionActions.createTerminalWithStatus,
      props.defaultTerminalShellId,
      sessionActions.fileEditorState,
      focusLocalTerminalDock,
      props.centerTabs.handleOpenWorkspaceBrowser,
      isCenterDiffExpanded,
      isCenterFullDiffExpanded,
      props.navigation.openSettingsPage,
      dialogs.openStartupDependenciesDialog,
      sessionFocusCommands,
      props.safely,
      layout.selectedChange,
      setActiveView,
      setActiveWorkspaceContentTab,
      sessionActions.setFileEditorState,
      setIsCenterDiffExpanded,
      setIsChangesSidebarCollapsed,
      setIsLocalTerminalDockCollapsed,
      setIsWorkspaceSidebarCollapsed,
      setWorkspaceQuickSearchRequestId,
      props.uiCommands.openAddWorkspaceDialog,
      props.uiCommands.openCreateAgentDialog,
      props.uiCommands.openCreateTerminalDialog,
      props.uiCommands.openKeyboardShortcutsDialog,
      props.uiCommands.openWorkspaceSwitcherDialog,
      snapshot,
      uiState.aiChatTabs,
      uiState.browserTabs,
      uiState.focusedAiChatTabId,
      uiState.focusedBrowserTabId,
      uiState.focusedForgeViewerTabId,
      uiState.forgeViewerTabs
    ]
  );

  useKeyboardShortcuts(SHORTCUT_DEFINITIONS, keyboardShortcutActions);

  const handleCopyLinuxUpdateCommand = useCallback((): void => {
    if (!props.linuxUpdateNotice.linuxUpdateStatus) {
      return;
    }

    void noraSystemClient.copyText(props.linuxUpdateNotice.linuxUpdateStatus.updateCommand).then(() => {
      props.shellFrame.flashStatus("Linux upgrade command copied");
    }).catch(props.captureError);
  }, [props.captureError, props.linuxUpdateNotice.linuxUpdateStatus, props.shellFrame]);

  const handleOpenLinuxRelease = useCallback((): void => {
    if (!props.linuxUpdateNotice.linuxUpdateStatus) {
      return;
    }

    void noraSystemClient.openExternalUrl(props.linuxUpdateNotice.linuxUpdateStatus.releaseUrl).catch(props.captureError);
  }, [props.captureError, props.linuxUpdateNotice.linuxUpdateStatus]);

  const handleCopyLinuxAptManualCommands = useCallback((): void => {
    if (!dialogs.linuxAptSetupStatus) {
      return;
    }

    void noraSystemClient.copyText(dialogs.linuxAptSetupStatus.manualCommands.join("\n")).then(() => {
      props.shellFrame.flashStatus("Linux APT setup commands copied");
    }).catch(props.captureError);
  }, [dialogs.linuxAptSetupStatus, props.captureError, props.shellFrame]);

  const forgeIntegration = useForgeIntegration({
    githubToken: props.preferences.githubToken,
    gitlabToken: props.preferences.gitlabToken,
    gitlabHost: props.preferences.gitlabHost,
    updateGithubToken: props.preferences.updateGithubToken,
    updateGitlabToken: props.preferences.updateGitlabToken,
    updateVercelToken: props.preferences.updateVercelToken,
    updateGithubAccountLabel: props.preferences.updateGithubAccountLabel,
    updateGitlabAccountLabel: props.preferences.updateGitlabAccountLabel,
    updateVercelAccountLabel: props.preferences.updateVercelAccountLabel,
    statusBar: props.shellFrame.statusBar,
    captureError: props.captureError,
    setActiveChangesPanelTab,
    setIsCreatePullRequestDialogOpen: dialogs.setIsCreatePullRequestDialogOpen
  });
  const vercelIntegration = useVercelIntegration({
    activeChangesPanelTab,
    forgeOverview: forgeIntegration.forgeOverview,
    vercelToken: props.preferences.vercelToken,
    vercelWorkspaceLinks: props.preferences.vercelWorkspaceLinks,
    updateVercelWorkspaceLinks: props.preferences.updateVercelWorkspaceLinks,
    updateVercelToken: props.preferences.updateVercelToken,
    updateVercelAccountLabel: props.preferences.updateVercelAccountLabel
  });

  useAppRootForgeViewerWorkItemDetailEffect({
    focusedForgeViewerTab: layout.focusedForgeViewerTab,
    forgeWorkItemDetail: forgeIntegration.forgeWorkItemDetail,
    loadForgeWorkItemDetail: forgeIntegration.loadForgeWorkItemDetail
  });

  const {
    handleSpawnForgeIssueAgent,
    handleOpenProjectInIde
  } = useForgeActionHandlers({
    forgeWorkItemDetail: forgeIntegration.forgeWorkItemDetail,
    canOpenProjectInIde: derived.canOpenProjectInIde,
    runWithStatus: props.snapshotCommands.runWithStatus,
    statusBar: props.shellFrame.statusBar,
    updateSnapshotState: props.snapshotCommands.updateSnapshotState,
    safelyAndRefresh: props.snapshotCommands.safelyAndRefresh,
    captureError: props.captureError,
    trackForgeIssueAgentCreation: (payload) => {
      trackAgentCreation(payload, "forge-issue");
    }
  });

  const { agentsNeedingAttention } = useAgentAttention({
    focusedAgentId: layout.focusedAgent?.id ?? null,
    onAgentCompletion: async (agent) => {
      if (!props.preferences.appSettings.agentCompletionNotificationsEnabled) {
        return;
      }

      const detail = agent.lastTerminalLine.trim() || agent.task.trim() || "Agent finished working.";
      await noraSystemClient.showAgentCompletionNotification({
        agentId: agent.id,
        title: `${agent.name} is ready`,
        body: detail
      });
    }
  });

  const workspaceSwitcherEntries = snapshot ? getWorkspaceSwitcherEntries(snapshot) : [];
  const workspaceTerminalPresetProject =
    snapshot && uiState.workspaceTerminalPresetsProjectId
      ? [
          ...(snapshot.project ? [snapshot.project] : []),
          ...snapshot.workspaces.map((workspace) => workspace.project)
        ].find((project) => project.id === uiState.workspaceTerminalPresetsProjectId) ?? null
      : null;

  const chromeShellSources = useAppRootChromeShellSources({
    keyboardShortcutActions,
    workspaceQuickSearchSource: derived.workspaceQuickSearchSource,
    workspaceQuickSearchRequestId,
    workspaceQuickSearchOpenShortcutLabel: derived.workspaceQuickSearchOpenShortcutLabel,
    handleWorkspaceQuickSearchPick: mainSurface.handleWorkspaceQuickSearchPick,
    focusLocalTerminalDock,
    activeChangesPanelTab,
    setActiveChangesPanelTab,
    canOpenProjectInIde: derived.canOpenProjectInIde,
    preferredIde: derived.preferredIde,
    handleOpenProjectInIde,
    handleOpenRecentWorkspace: props.workspaceLifecycle.handleOpenRecentWorkspace,
    handleSubmitIssue: props.issueReporter.handleSubmitIssue,
    openCreateAgentModal: props.navigation.openCreateAgentModal,
    openWorkspaceBrowserFromTitleBar: props.navigation.openWorkspaceBrowserFromTitleBar,
    openCreateTerminalModal: props.navigation.openCreateTerminalModal,
    autoUpdateStatus: props.autoUpdate.autoUpdateStatus,
    isInstallingDownloadedUpdate: props.autoUpdate.isInstallingDownloadedUpdate,
    handleInstallDownloadedUpdate: props.autoUpdate.handleInstallDownloadedUpdate,
    linuxUpdateStatus: props.linuxUpdateNotice.linuxUpdateStatus,
    handleCopyLinuxUpdateCommand,
    handleOpenLinuxRelease,
    dismissLinuxUpdateNotice: props.linuxUpdateNotice.dismissLinuxUpdateNotice,
    statusEntries: props.shellFrame.statusEntries,
    installStatusBarTool: props.toolInstallFlows.installStatusBarTool,
    switchStatusBarToolAccount: props.toolInstallFlows.switchStatusBarToolAccount,
    toggleSettingsPage: props.navigation.toggleSettingsPage,
    openStartupDependenciesDialog: dialogs.openStartupDependenciesDialog,
    openAddWorkspaceModal: props.workspaceLifecycle.openAddWorkspaceModal,
    defaultIdeId: props.preferences.defaultIdeId,
    installedIdes: props.bootstrap.installedIdes,
    isLoadingInstalledIdes: props.bootstrap.isLoadingInstalledIdes,
    useMacTitleBarChrome,
    themeMode: props.preferences.themeMode,
    toggleTheme: props.preferences.toggleTheme,
    isWorkspaceSidebarCollapsed,
    isChangesSidebarCollapsed,
    setIsChangesSidebarCollapsed,
    setIsWorkspaceSidebarCollapsed,
    setIsLocalTerminalDockCollapsed,
    settingsGroup
  });
  const settingsRuntimeAssemblyInput = useAppRootSettingsRuntimeAssemblyInput({
    setActiveView,
    themeMode: props.preferences.themeMode,
    updateThemeMode: props.preferences.updateThemeMode,
    accentColor: props.preferences.accentColor,
    updateAccentColor: props.preferences.updateAccentColor,
    terminalThemeId: props.preferences.terminalThemeId,
    updateTerminalTheme: props.preferences.updateTerminalTheme,
    terminalFontId: props.preferences.terminalFontId,
    updateTerminalFont: props.preferences.updateTerminalFont,
    resolvedTheme: props.preferences.resolvedTheme,
    defaultTerminalShellId: props.defaultTerminalShellId,
    handleDefaultTerminalShellChange: derived.handleDefaultTerminalShellChange,
    installedIdes: props.bootstrap.installedIdes,
    defaultIdeId: props.preferences.defaultIdeId,
    updateDefaultIde: props.preferences.updateDefaultIde,
    forgeOAuthProviders: props.bootstrap.forgeOAuthProviders,
    isLoadingForgeOAuthProviders: props.bootstrap.isLoadingForgeOAuthProviders,
    githubToken: props.preferences.githubToken,
    githubAccountLabel: props.preferences.githubAccountLabel,
    updateGithubToken: props.preferences.updateGithubToken,
    connectForgeAccount: forgeIntegration.connectForgeAccount,
    updateGithubAccountLabel: props.preferences.updateGithubAccountLabel,
    gitlabToken: props.preferences.gitlabToken,
    gitlabHost: props.preferences.gitlabHost,
    gitlabAccountLabel: props.preferences.gitlabAccountLabel,
    updateGitlabToken: props.preferences.updateGitlabToken,
    updateGitlabHost: props.preferences.updateGitlabHost,
    updateGitlabAccountLabel: props.preferences.updateGitlabAccountLabel,
    vercelToken: props.preferences.vercelToken,
    vercelAccountLabel: props.preferences.vercelAccountLabel,
    updateVercelToken: props.preferences.updateVercelToken,
    disconnectVercelAccount: vercelIntegration.disconnectVercelAccount,
    appSettings: props.preferences.appSettings,
    updateFileEditorThemeId: props.preferences.updateFileEditorThemeId,
    updateHardwareAccelerationEnabled: props.preferences.updateHardwareAccelerationEnabled,
    updateWorkspaceStateStorageMode: props.preferences.updateWorkspaceStateStorageMode,
    updateDefaultAgentLaunchTarget: props.preferences.updateDefaultAgentLaunchTarget,
    updateSplitViewPreferences: props.preferences.updateSplitViewPreferences,
    canPreviewMacTitleBarChrome,
    forceMacTitleBarPreview: props.preferences.forceMacTitleBarPreview,
    updateForceMacTitleBarPreview: props.preferences.updateForceMacTitleBarPreview,
    updateNotificationPreferences: props.preferences.updateNotificationPreferences,
    updateAnalyticsConsentStatus: props.preferences.updateAnalyticsConsentStatus,
    analyticsAllowedInCurrentRun: dialogs.analyticsRuntimeConfig?.analyticsAllowedInCurrentRun ?? __NORA_IS_PRODUCTION__,
    analyticsRuntimeConfig: dialogs.analyticsRuntimeConfig,
    updateBrowserPreferences: props.preferences.updateBrowserPreferences,
    chromeCookieProfiles: dialogs.chromeCookieProfiles,
    selectedChromeCookieProfileId: dialogs.selectedChromeCookieProfileId,
    isLoadingChromeCookieProfiles: dialogs.isLoadingChromeCookieProfiles,
    setSelectedChromeCookieProfileId: dialogs.setSelectedChromeCookieProfileId,
    loadChromeCookieProfiles: dialogs.loadChromeCookieProfiles,
    handleImportChromeBrowserData: dialogs.handleImportChromeBrowserData,
    updateTerminalPresets: props.preferences.updateTerminalPresets,
    updateTerminalQuickLaunchDefaults: props.preferences.updateTerminalQuickLaunchDefaults,
    updateAiPreferredProvider: props.preferences.updateAiPreferredProvider,
    updateAiApiKey: props.preferences.updateAiApiKey,
    updateAiModel: props.preferences.updateAiModel,
    aiModelOptions: props.aiModels.aiModelOptions,
    aiModelLoading: props.aiModels.aiModelLoading,
    aiModelError: props.aiModels.aiModelError,
    refreshAiModels: props.aiModels.refreshAiModels,
    relaunchApplication: props.preferences.relaunchApplication,
    safely: props.safely,
    missingOptionalStartupDependencyCount: dialogs.missingOptionalStartupDependencyCount,
    openStartupDependenciesDialog: dialogs.openStartupDependenciesDialog,
    isWorkspaceSidebarCollapsed,
    isChangesSidebarCollapsed,
    isRemoteMountsSectionCollapsed,
    isPortsSectionCollapsed,
    isChatbotsSectionCollapsed,
    isCliSectionCollapsed,
    isSkillsSectionCollapsed,
    isSpecsSectionCollapsed,
    isLocalTerminalDockCollapsed,
    setIsWorkspaceSidebarCollapsed,
    setIsChangesSidebarCollapsed,
    setIsRemoteMountsSectionCollapsed,
    setIsPortsSectionCollapsed,
    setIsChatbotsSectionCollapsed,
    setIsCliSectionCollapsed,
    setIsSkillsSectionCollapsed,
    setIsSpecsSectionCollapsed,
    setIsLocalTerminalDockCollapsed,
    showToast: props.shellFrame.showToast,
    captureError: props.captureError,
    searchToolSkills: (toolId: string, query: string) => noraToolingClient.searchToolSkills(toolId, query)
  });
  const modalExtrasSources = useAppRootModalExtrasSources({
    agentPendingDestroy: derived.agentPendingDestroy,
    setForgeOAuthDevicePrompt: props.autoUpdate.setForgeOAuthDevicePrompt,
    setIsBrowserCookieImportPromptOpen: dialogs.setIsBrowserCookieImportPromptOpen,
    setSelectedChromeCookieProfileId: dialogs.setSelectedChromeCookieProfileId,
    setIsCreatePullRequestDialogOpen: dialogs.setIsCreatePullRequestDialogOpen,
    handleCreateAgentFromDialog: content.handleCreateAgentFromDialog,
    forgeOAuthDevicePrompt: props.autoUpdate.forgeOAuthDevicePrompt,
    shouldShowStartupDependenciesDialog: dialogs.shouldShowStartupDependenciesDialog,
    effectiveStartupDependencyReport: dialogs.effectiveStartupDependencyReport,
    isStartupDependencyDialogBusy: dialogs.isStartupDependencyDialogBusy,
    startupDependencyInstallTargetId: dialogs.startupDependencyInstallTargetId,
    startupDependencyInstallErrorMessage: dialogs.startupDependencyInstallErrorMessage,
    simulatedMissingDependencyIds: dialogs.simulatedMissingDependencyIds,
    handleStartupDependenciesDialogOpenChange: dialogs.handleStartupDependenciesDialogOpenChange,
    installStartupDependencyWithRefresh: dialogs.installStartupDependencyWithRefresh,
    copyStartupDependencyInstructions: dialogs.copyStartupDependencyInstructions,
    toggleSimulatedMissingDependency: dialogs.toggleSimulatedMissingDependency,
    clearSimulatedMissingDependencies: dialogs.clearSimulatedMissingDependencies,
    reloadStartupDependencyReport: dialogs.reloadStartupDependencyReport,
    workspaceTerminalPresetProject,
    saveWorkspaceTerminalPresets: sessionActions.saveWorkspaceTerminalPresets,
    isCreatePullRequestDialogOpen: dialogs.isCreatePullRequestDialogOpen,
    handleChooseLocalWorkspace: props.workspaceLifecycle.handleChooseLocalWorkspace,
    isLinuxAptSetupDialogOpen: dialogs.isLinuxAptSetupDialogOpen,
    linuxAptSetupStatus: dialogs.linuxAptSetupStatus,
    isInstallingLinuxAptUpdates: dialogs.isInstallingLinuxAptUpdates,
    linuxAptSetupErrorMessage: dialogs.linuxAptSetupErrorMessage,
    closeLinuxAptSetupDialog: dialogs.closeLinuxAptSetupDialog,
    installLinuxAptUpdates: dialogs.installLinuxAptUpdates,
    handleCopyLinuxAptManualCommands,
    isBrowserCookieImportPromptOpen: dialogs.isBrowserCookieImportPromptOpen,
    chromeCookieProfiles: dialogs.chromeCookieProfiles,
    selectedChromeCookieProfileId: dialogs.selectedChromeCookieProfileId,
    isLoadingChromeCookieProfiles: dialogs.isLoadingChromeCookieProfiles,
    isImportingChromeBrowserData: dialogs.isImportingChromeBrowserData,
    updateBrowserPreferences: props.preferences.updateBrowserPreferences,
    loadChromeCookieProfiles: dialogs.loadChromeCookieProfiles,
    runChromeBrowserDataImport: dialogs.runChromeBrowserDataImport,
    isAnalyticsConsentDialogOpen: dialogs.isAnalyticsConsentDialogOpen,
    allowAnalyticsConsent: dialogs.allowAnalyticsConsent,
    declineAnalyticsConsent: dialogs.declineAnalyticsConsent,
    workspaceSwitcherEntries
  });
  const workspaceSidebarSources = useAppRootWorkspaceSidebarSources({
    agentsNeedingAttention,
    collapsedWorkspaceIds,
    focusWorkspaceAiChatTab: mainSurface.focusWorkspaceAiChatTab,
    focusWorkspaceWithRecovery: props.workspaceLoading.focusWorkspaceWithRecovery,
    focusedAgent: layout.focusedAgent,
    focusedTerminal: layout.focusedTerminal,
    focusedWorkspace: layout.focusedWorkspace,
    githubToken: props.preferences.githubToken,
    gitlabHost: props.preferences.gitlabHost,
    gitlabToken: props.preferences.gitlabToken,
    handleChooseWorkspaceAtPath: props.workspaceLifecycle.handleChooseWorkspaceAtPath,
    handleOpenWorkspaceBrowser: props.centerTabs.handleOpenWorkspaceBrowser,
    handleRemoveWorkspace: props.workspaceLifecycle.handleRemoveWorkspace,
    isChatbotsSectionCollapsed,
    isCliSectionCollapsed,
    isPortsSectionCollapsed,
    isRemoteMountsSectionCollapsed,
    isWorkspaceSidebarCollapsed,
    launchTerminalInWorkspace: sessionActions.launchTerminalInWorkspace,
    openAiChatFromSidebar: layout.openAiChatFromSidebar,
    openSettingsPage: props.navigation.openSettingsPage,
    openAddWorkspaceModal: props.workspaceLifecycle.openAddWorkspaceModal,
    removingWorkspaceRoots,
    resolveInstallCommand: props.toolInstallFlows.resolveInstallCommand,
    safely: props.safely,
    setCollapsedWorkspaceIds,
    setFileEditorState: sessionActions.setFileEditorState,
    setIsCenterDiffExpanded,
    setIsChatbotsSectionCollapsed,
    setIsCliSectionCollapsed,
    setIsPortsSectionCollapsed,
    setIsRemoteMountsSectionCollapsed,
    setIsWorkspaceSidebarCollapsed,
    setWorkspaceSessionActiveViewId: layout.workspaceSessionViews.setActiveViewId,
    terminalPresets: props.preferences.appSettings.terminalPresets,
    terminalQuickLaunchDefaults: props.preferences.appSettings.terminalQuickLaunchDefaults,
    uiCommands: props.uiCommands,
    uiState,
    workspaceNotes: derived.allWorkspaceNotes,
    workspaceSpecs: derived.allWorkspaceSpecs,
    workspaceTasks: derived.allWorkspaceTasks
  });
  const activityRefreshTimeoutRef = useRef<number | null>(null);
  const taskRefreshTimeoutRef = useRef<number | null>(null);

  useAppRuntimeEffects({
    activeWorkspaceContentTab,
    fileEditorState: sessionActions.fileEditorState,
    setFileEditorState: sessionActions.setFileEditorState,
    setUiState,
    setAppClosingState,
    setLocalTerminalState,
    workspaceLoading: props.workspaceLoading.workspaceLoading,
    isAddingWorkspace,
    isRemoteMountedWorkspace: layout.isRemoteMountedWorkspace,
    refreshSnapshot: props.refreshSnapshot,
    activityRefreshTimeoutRef,
    taskRefreshTimeoutRef,
    reloadWorkspaceTasksForProject: resources.reloadWorkspaceTasksForProject,
    selectedChange: layout.selectedChange,
    setIsCenterDiffExpanded,
    setTaskEditorState: content.setTaskEditorState,
    addWorkspaceBaselineSignatureRef: props.addWorkspaceBaselineSignatureRef,
    finishAddingWorkspace: props.finishAddingWorkspace,
    getWorkspacePresenceSignature
  });

  const signedInWiring = useMemo((): AppRootSignedInProviderSlicesWiringInput | null => {
    if (!snapshot || !settingsRuntimeAssemblyInput || !workspaceSidebarSources) {
      return null;
    }

    return buildAppRootSignedInProviderSlicesWiringInput({
      settingsAssemblyInput: settingsRuntimeAssemblyInput,
      shell: {
        core: {
          snapshot,
          uiState,
          setUiState,
          setActiveView,
          safely: props.safely,
          captureError: props.captureError,
          normalizeSnapshot: props.normalizeSnapshot,
          dismissWorkspaceLoading: props.workspaceLoading.dismissWorkspaceLoading,
          appSettings: props.preferences.appSettings,
          resolvedTheme: props.preferences.resolvedTheme,
          windowUiState: props.bootstrap.windowUiState,
          activeView,
          openSettingsPage: props.navigation.openSettingsPage,
          resolveInstallCommand: props.toolInstallFlows.resolveInstallCommand,
          clearCapturedError: props.clearCapturedError,
          createTerminalWithStatus: sessionActions.createTerminalWithStatus,
          openAddRemoteWorkspaceModal: props.navigation.openAddRemoteWorkspaceModal,
          focusWorkspaceWithRecovery: props.workspaceLoading.focusWorkspaceWithRecovery,
          uiCommands: props.uiCommands
        },
        workspaceCatalog: {
          workspaceTasks: resources.workspaceTasks,
          workspaceSpecs: resources.workspaceSpecs,
          workspaceNotes: resources.workspaceNotes,
          workspaceTaskBoards: resources.workspaceTaskBoards,
          updateWorkspaceTaskBoard: resources.updateWorkspaceTaskBoard,
          allWorkspaceTasks: derived.allWorkspaceTasks,
          allWorkspaceSpecs: derived.allWorkspaceSpecs,
          allWorkspaceNotes: derived.allWorkspaceNotes
        },
        workspaceContent: content,
        forgeSliceInput: {
          integration: forgeIntegration,
          resolveGitlabForgeRepoOverride: props.centerTabs.resolveGitlabForgeRepoOverride,
          handleSpawnForgeIssueAgent,
          focusedForgeViewerTab: layout.focusedForgeViewerTab
        },
        vercelSliceInput: {
          integration: vercelIntegration,
          vercelAccountLabel: props.preferences.vercelAccountLabel,
          vercelToken: props.preferences.vercelToken
        },
        gitBranches: {
          activeBranch: derived.activeBranch,
          parentRepoBranch: derived.parentRepoBranch
        },
        sessionSurfaceSliceInput: {
          workspaceSessionViews: layout.workspaceSessionViews,
          activeSplitViewCollection: layout.activeSplitViewCollection,
          activeWorkspaceContentTab,
          fileEditorState: sessionActions.fileEditorState,
          focusedAgent: layout.focusedAgent,
          focusedAiChatTab: layout.focusedAiChatTab,
          focusedBrowserTab: layout.focusedBrowserTab,
          focusedForgeViewerTab: layout.focusedForgeViewerTab,
          focusedTerminal: layout.focusedTerminal,
          focusedWorkspace: layout.focusedWorkspace,
          selectedChange: layout.selectedChange,
          isCenterDiffExpanded: activeWorkspaceContentTab === "diff",
          isCenterFullDiffExpanded,
          setActiveWorkspaceContentTab,
          setFileEditorState: sessionActions.setFileEditorState,
          setIsCenterDiffExpanded,
          setIsCenterFullDiffExpanded,
          splitViewsErrorMessage: layout.splitViewsErrorMessage,
          splitViewsLoading: layout.splitViewsLoading,
          shouldShowProjectSelectorScreen: layout.shouldShowProjectSelectorScreen,
          terminalFontId: props.preferences.terminalFontId,
          terminalThemeId: props.preferences.terminalThemeId
        },
        centerTabsSliceInput: {
          closeAiChatTab: props.centerTabs.closeAiChatTab,
          closeBrowserTab: props.browserTabs.closeBrowserTab,
          closeForgeViewerTab: props.centerTabs.closeForgeViewerTab,
          focusAiChatTab: props.centerTabs.focusAiChatTab,
          focusBrowserTab: props.browserTabs.focusBrowserTab,
          focusForgeViewerTab: props.centerTabs.focusForgeViewerTab,
          handleOpenWorkspaceBrowser: props.centerTabs.handleOpenWorkspaceBrowser,
          openAiChat: props.centerTabs.openAiChat,
          openForgeViewer: props.centerTabs.openForgeViewer,
          updateAiChatTabMessages: props.centerTabs.updateAiChatTabMessages,
          updateAiChatTabReasoningMode: props.centerTabs.updateAiChatTabReasoningMode,
          updateAiChatTabTitle: props.centerTabs.updateAiChatTabTitle,
          updateBrowserTab: props.browserTabs.updateBrowserTab,
          saveFileEditor: sessionActions.saveFileEditor
        },
        aiModelsSliceInput: {
          aiModelOptions: props.aiModels.aiModelOptions,
          aiModelLoading: props.aiModels.aiModelLoading,
          handleSelectAiChatProviderModel: props.aiModels.handleSelectAiChatProviderModel,
          aiModelError: props.aiModels.aiModelError,
          refreshAiModels: props.aiModels.refreshAiModels
        },
        modalExtras: modalExtrasSources,
        workspaceSidebarRest: workspaceSidebarSources,
        changesFileHandlers: {
          fileEditorActivePath: sessionActions.fileEditorState?.activePath ?? null,
          fileHandlers: {
            openFileEditor: sessionActions.openFileEditor,
            onCreateFile: fileMutations.handleCreateWorkspaceFile,
            onCreateDirectory: fileMutations.handleCreateWorkspaceDirectory,
            onRenameFile: fileMutations.handleRenameWorkspaceFile,
            onDeleteFile: fileMutations.handleDeleteWorkspaceFile
          },
          openFileEditor: sessionActions.openFileEditor,
          openForgeViewer: props.centerTabs.openForgeViewer,
          openCreateAgentDialog: props.uiCommands.openCreateAgentDialog
        },
        chromeShell: chromeShellSources
      },
      shellLayout: {
        workspaceRuntimeValue: derived.workspaceRuntimeValue,
        workspaceSidebarWidth,
        changesSidebarWidth,
        hasActiveWorkspace: layout.hasActiveWorkspace,
        isWorkspaceSidebarCollapsed,
        isChangesSidebarCollapsed,
        startSidebarResize,
        localTerminalState,
        localTerminalDockHeight,
        isLocalTerminalDockCollapsed,
        isCreatingLocalTerminal,
        localTerminalDockFocusVersion,
        setLocalTerminalDockHeight,
        setIsLocalTerminalDockCollapsed,
        workspaceLoading: props.workspaceLoading.workspaceLoading,
        isAddingWorkspace,
        appClosingState,
        dismissWorkspaceLoading: props.workspaceLoading.dismissWorkspaceLoading
      }
    });
  }, [
    snapshot,
    settingsRuntimeAssemblyInput,
    workspaceSidebarSources,
    uiState,
    setUiState,
    setActiveView,
    props.safely,
    props.captureError,
    props.normalizeSnapshot,
    props.workspaceLoading.dismissWorkspaceLoading,
    props.preferences.appSettings,
    props.preferences.resolvedTheme,
    props.bootstrap.windowUiState,
    activeView,
    props.navigation.openSettingsPage,
    props.toolInstallFlows.resolveInstallCommand,
    props.clearCapturedError,
    sessionActions.createTerminalWithStatus,
    props.navigation.openAddRemoteWorkspaceModal,
    props.workspaceLoading.focusWorkspaceWithRecovery,
    props.uiCommands,
    resources.workspaceTasks,
    resources.workspaceSpecs,
    resources.workspaceNotes,
    resources.workspaceTaskBoards,
    resources.updateWorkspaceTaskBoard,
    derived.allWorkspaceTasks,
    derived.allWorkspaceSpecs,
    derived.allWorkspaceNotes,
    content,
    forgeIntegration,
    props.centerTabs.resolveGitlabForgeRepoOverride,
    handleSpawnForgeIssueAgent,
    layout.focusedForgeViewerTab,
    vercelIntegration,
    props.preferences.vercelAccountLabel,
    props.preferences.vercelToken,
    derived.activeBranch,
    derived.parentRepoBranch,
    layout.workspaceSessionViews,
    layout.activeSplitViewCollection,
    activeWorkspaceContentTab,
    sessionActions.fileEditorState,
    layout.focusedAgent,
    layout.focusedAiChatTab,
    layout.focusedBrowserTab,
    layout.focusedForgeViewerTab,
    layout.focusedTerminal,
    layout.focusedWorkspace,
    layout.selectedChange,
    setActiveWorkspaceContentTab,
    sessionActions.setFileEditorState,
    setIsCenterDiffExpanded,
    setIsCenterFullDiffExpanded,
    layout.splitViewsErrorMessage,
    layout.splitViewsLoading,
    layout.shouldShowProjectSelectorScreen,
    props.preferences.terminalFontId,
    props.preferences.terminalThemeId,
    props.centerTabs.closeAiChatTab,
    props.browserTabs.closeBrowserTab,
    props.centerTabs.closeForgeViewerTab,
    props.centerTabs.focusAiChatTab,
    props.browserTabs.focusBrowserTab,
    props.centerTabs.focusForgeViewerTab,
    props.centerTabs.handleOpenWorkspaceBrowser,
    props.centerTabs.openAiChat,
    props.centerTabs.openForgeViewer,
    props.centerTabs.updateAiChatTabMessages,
    props.centerTabs.updateAiChatTabReasoningMode,
    props.centerTabs.updateAiChatTabTitle,
    props.browserTabs.updateBrowserTab,
    sessionActions.saveFileEditor,
    props.aiModels.aiModelOptions,
    props.aiModels.aiModelLoading,
    props.aiModels.handleSelectAiChatProviderModel,
    props.aiModels.aiModelError,
    props.aiModels.refreshAiModels,
    modalExtrasSources,
    fileMutations.handleCreateWorkspaceFile,
    fileMutations.handleCreateWorkspaceDirectory,
    fileMutations.handleRenameWorkspaceFile,
    fileMutations.handleDeleteWorkspaceFile,
    chromeShellSources,
    derived.workspaceRuntimeValue,
    workspaceSidebarWidth,
    changesSidebarWidth,
    layout.hasActiveWorkspace,
    isWorkspaceSidebarCollapsed,
    isChangesSidebarCollapsed,
    startSidebarResize,
    localTerminalState,
    localTerminalDockHeight,
    isLocalTerminalDockCollapsed,
    isCreatingLocalTerminal,
    localTerminalDockFocusVersion,
    setLocalTerminalDockHeight,
    setIsLocalTerminalDockCollapsed,
    props.workspaceLoading.workspaceLoading,
    isAddingWorkspace,
    appClosingState
  ]);

  const signedIn = useAppRootSignedInProviderSlices(signedInWiring);

  if (!signedIn) {
    return null;
  }

  return (
    <ToastProvider swipeDirection="right">
      <SignedInShellComposition
        signedIn={signedIn}
        shellFrameValue={{ statusBar: props.shellFrame.statusBar, toasts: props.shellFrame.toasts, dismissToast: props.shellFrame.dismissToast }}
      >
        <AppRootOrchestratedTree />
      </SignedInShellComposition>
    </ToastProvider>
  );
}
