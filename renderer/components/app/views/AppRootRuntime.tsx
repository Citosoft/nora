import { StatusBar as AppStatusBar } from "@/components/app/chrome/StatusBar";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { noraTerminalClient } from "@/components/app/clients/noraTerminalClient";
import { AppRootDialogsProvider, useAppRootDialogs } from "@/components/app/context/appRootDialogsContext";
import { useAppRootShellState } from "@/components/app/context/appRootShellStateContext";
import { useAppRootState } from "@/components/app/context/appRootStateContext";
import { useAiModelCatalog } from "@/components/app/hooks/useAiModelCatalog";
import { useAppAnalyticsLifecycle } from "@/components/app/hooks/useAppAnalyticsLifecycle";
import { useAppAutoUpdate } from "@/components/app/hooks/useAppAutoUpdate";
import { useAppBootstrap } from "@/components/app/hooks/useAppBootstrap";
import { useAppCenterTabs } from "@/components/app/hooks/useAppCenterTabs";
import { useAppIssueReporter } from "@/components/app/hooks/useAppIssueReporter";
import { useAppMainOrchestration } from "@/components/app/hooks/useAppMainOrchestration";
import { useAppNavigationActions } from "@/components/app/hooks/useAppNavigationActions";
import { useMacApplicationMenuBridge } from "@/components/app/hooks/useMacApplicationMenuBridge";
import { useAppPreLaunchViewProps } from "@/components/app/hooks/useAppPreLaunchViewProps";
import { useAppPreferences } from "@/components/app/hooks/useAppPreferences";
import { useAppRootShellFrame } from "@/components/app/hooks/useAppRootShellFrame";
import { useAppRootSnapshotCommands } from "@/components/app/hooks/useAppRootSnapshotCommands";
import { useAppToolInstallFlows } from "@/components/app/hooks/useAppToolInstallFlows";
import { useAppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import { useBrowserTabs } from "@/components/app/hooks/useBrowserTabs";
import { useKeyboardShortcuts } from "@/components/app/hooks/useKeyboardShortcuts";
import { useLinuxUpdateNotice } from "@/components/app/hooks/useLinuxUpdateNotice";
import { useWorkspaceLifecycleActions } from "@/components/app/hooks/useWorkspaceLifecycleActions";
import { useWorkspaceLoading } from "@/components/app/hooks/useWorkspaceLoading";
import { useWorkspaceSessionFocusCommands } from "@/components/app/hooks/useWorkspaceSessionFocusCommands";
import { useWorkspaceSnapshotRefresh } from "@/components/app/hooks/useWorkspaceSnapshotRefresh";
import type { MacApplicationMenuActionHandlers } from "@/components/app/logic/applyMacApplicationMenuCommand";
import { buildMacApplicationMenuSyncPayload } from "@/components/app/logic/buildMacApplicationMenuSyncPayload";
import { getWorkspacePresenceSignature } from "@/components/app/logic/appPresenceSignatures";
import { normalizeSnapshot } from "@/components/app/logic/appUtils";
import { appRootInitialWindowUiState } from "@/components/app/logic/appRootInitialState";
import { buildKeyboardShortcutActions } from "@/components/app/logic/buildKeyboardShortcutActions";
import { SHORTCUT_DEFINITIONS } from "@/components/app/logic/keyboardShortcuts";
import { getStoredTerminalShellIds } from "@/components/app/logic/terminalShellPreferences";
import type { AppRootRuntimeProps } from "@/components/app/types/appRootRuntime.types";
import type { CreateTerminalPayload } from "@shared/appTypes";
import type { FileEditorState } from "@/components/app/types";
import type { ShortcutActionMap } from "@/components/app/types/workflow.types";
import { AppPreLaunchView } from "@/components/app/views/AppPreLaunchView";
import { AppToastStack } from "@/components/app/views/AppToastStack";
import { SignedInAppRoot } from "@/components/app/views/SignedInAppRoot";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { useCallback, useMemo, useRef, useState, type Dispatch, type ReactElement, type SetStateAction } from "react";

export function AppRootRuntime({ storedWorkspaceContentState }: AppRootRuntimeProps): ReactElement {
  const { setUiState } = useAppRootState();
  const preferences = useAppPreferences();
  const uiCommands = useAppUiCommands(setUiState);
  const captureError = useCallback((error: unknown): void => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[nora] captured renderer error", error);
    setUiState((current) => ({
      ...current,
      activeErrorMessage: message,
      snapshot: current.snapshot ? normalizeSnapshot({ ...current.snapshot, errorMessage: message }) : current.snapshot
    }));
  }, [setUiState]);
  const { safely } = useAppMainOrchestration(setUiState, captureError);
  const shellFrame = useAppRootShellFrame();

  return (
    <AppRootDialogsProvider
      appSettings={preferences.appSettings}
      updateAnalyticsConsentStatus={preferences.updateAnalyticsConsentStatus}
      updateLinuxAptSetupPromptDismissed={preferences.updateLinuxAptSetupPromptDismissed}
      updateBrowserPreferences={preferences.updateBrowserPreferences}
      captureError={captureError}
      flashStatus={shellFrame.flashStatus}
      statusBar={shellFrame.statusBar}
    >
      <AppRootRuntimeContent
        storedWorkspaceContentState={storedWorkspaceContentState}
        preferences={preferences}
        uiCommands={uiCommands}
        safely={safely}
        captureError={captureError}
        shellFrame={shellFrame}
      />
    </AppRootDialogsProvider>
  );
}

function AppRootRuntimeContent({
  storedWorkspaceContentState,
  preferences,
  uiCommands,
  safely,
  captureError,
  shellFrame
}: AppRootRuntimeProps & {
  preferences: ReturnType<typeof useAppPreferences>;
  uiCommands: ReturnType<typeof useAppUiCommands>;
  safely: (action: () => Promise<import("@shared/appTypes").AppState>) => Promise<import("@shared/appTypes").AppState | null>;
  captureError: (error: unknown) => void;
  shellFrame: ReturnType<typeof useAppRootShellFrame>;
}): ReactElement | null {
  const { uiState, setUiState, snapshot } = useAppRootState();
  const {
    activeView,
    setActiveView,
    setSettingsGroup,
    setIsCenterDiffExpanded,
    setIsCenterFullDiffExpanded,
    setActiveWorkspaceContentTab,
    setIsChangesSidebarCollapsed,
    setIsLocalTerminalDockCollapsed,
    setIsWorkspaceSidebarCollapsed,
    setWorkspaceQuickSearchRequestId,
    focusLocalTerminalDock,
    isAddingWorkspace,
    setIsAddingWorkspace,
    setRemovingWorkspaceRoots
  } = useAppRootShellState();
  const dialogs = useAppRootDialogs();
  const [defaultTerminalShellId, setDefaultTerminalShellId] = useState<string | null>(() => getStoredTerminalShellIds().defaultShellId);
  const addWorkspaceBaselineSignatureRef = useRef("");
  const addWorkspaceStatusIdRef = useRef<number | null>(null);
  const {
    statusBar,
    statusEntries,
    toasts,
    dismissToast,
    showToast,
    updateToast
  } = shellFrame;
  const analyticsAllowedInCurrentRun = dialogs.analyticsRuntimeConfig?.analyticsAllowedInCurrentRun ?? __NORA_IS_PRODUCTION__;

  useAppAnalyticsLifecycle({
    analyticsConsentStatus: preferences.appSettings.analyticsConsentStatus,
    analyticsAllowedInCurrentRun
  });

  const issueReporter = useAppIssueReporter(captureError);
  const autoUpdate = useAppAutoUpdate({
    captureError,
    showToast,
    dismissToast,
    updateToast
  });
  const aiModels = useAiModelCatalog({
    apiKeys: preferences.appSettings.ai.apiKeys,
    modelByProvider: preferences.appSettings.ai.modelByProvider,
    preferredProvider: preferences.appSettings.ai.preferredProvider,
    updateAiPreferredProvider: preferences.updateAiPreferredProvider,
    updateAiModel: preferences.updateAiModel,
    captureError
  });
  const bootstrap = useAppBootstrap({
    setUiState,
    captureError,
    initialWindowUiState: appRootInitialWindowUiState
  });
  const canPreviewMacTitleBarChrome = !__NORA_IS_PRODUCTION__ && bootstrap.windowUiState.platform !== "darwin";
  const useMacTitleBarChrome =
    bootstrap.windowUiState.platform === "darwin" || (canPreviewMacTitleBarChrome && preferences.forceMacTitleBarPreview);
  const linuxUpdateNotice = useLinuxUpdateNotice();

  const clearCapturedError = useCallback((): void => {
    setUiState((current) => ({
      ...current,
      activeErrorMessage: null,
      snapshot: current.snapshot ? normalizeSnapshot({ ...current.snapshot, errorMessage: null }) : current.snapshot
    }));
  }, [setUiState]);
  const handleCopyLinuxUpdateCommand = useCallback((): void => {
    if (!linuxUpdateNotice.linuxUpdateStatus) {
      return;
    }

    void noraSystemClient.copyText(linuxUpdateNotice.linuxUpdateStatus.updateCommand).then(() => {
      shellFrame.flashStatus("Linux upgrade command copied");
    }).catch(captureError);
  }, [captureError, linuxUpdateNotice.linuxUpdateStatus, shellFrame]);

  const handleOpenLinuxRelease = useCallback((): void => {
    if (!linuxUpdateNotice.linuxUpdateStatus) {
      return;
    }

    void noraSystemClient.openExternalUrl(linuxUpdateNotice.linuxUpdateStatus.releaseUrl).catch(captureError);
  }, [captureError, linuxUpdateNotice.linuxUpdateStatus]);

  const { refreshSnapshot } = useWorkspaceSnapshotRefresh({
    setUiState,
    statusBar,
    captureError
  });
  const snapshotCommands = useAppRootSnapshotCommands({
    setUiState,
    statusBar,
    safely,
    refreshSnapshot
  });
  const createTerminalWithStatus = useCallback(
    async (payload: CreateTerminalPayload) =>
      snapshotCommands.runWithStatus("Creating terminal", () => noraTerminalClient.createTerminal(payload)),
    [snapshotCommands.runWithStatus]
  );
  const workspaceLoading = useWorkspaceLoading({
    setUiState,
    captureError
  });

  const finishAddingWorkspace = useCallback((): void => {
    setIsAddingWorkspace(false);
    if (addWorkspaceStatusIdRef.current !== null) {
      statusBar.endStatus(addWorkspaceStatusIdRef.current);
      addWorkspaceStatusIdRef.current = null;
    }
  }, [setIsAddingWorkspace, statusBar]);

  const workspaceLifecycle = useWorkspaceLifecycleActions({
    setUiState,
    setIsAddingWorkspace,
    setRemovingWorkspaceRoots,
    statusBar,
    safely,
    focusWorkspaceWithRecovery: workspaceLoading.focusWorkspaceWithRecovery,
    finishAddingWorkspace,
    addWorkspaceBaselineSignatureRef,
    addWorkspaceStatusIdRef,
    getWorkspacePresenceSignature
  });
  const browserTabs = useBrowserTabs({
    browserTabs: uiState.browserTabs,
    focusedBrowserTabId: uiState.focusedBrowserTabId,
    setUiState,
    openInternalBrowserOnNewPortDetection: preferences.appSettings.openInternalBrowserOnNewPortDetection,
    onShowBrowser: () => {
      setActiveView("main");
    }
  });
  const centerTabs = useAppCenterTabs({
    aiChatTabs: uiState.aiChatTabs,
    focusedAiChatTabId: uiState.focusedAiChatTabId,
    forgeViewerTabs: uiState.forgeViewerTabs,
    focusedForgeViewerTabId: uiState.focusedForgeViewerTabId,
    setUiState,
    setActiveView,
    openWorkspaceBrowser: browserTabs.openWorkspaceBrowser,
    gitlabHost: preferences.gitlabHost
  });
  const navigation = useAppNavigationActions({
    activeView,
    setActiveView,
    setSettingsGroup,
    setUiState,
    snapshotProjectId: snapshot?.project?.id ?? null,
    defaultTerminalShellId,
    terminalQuickLaunchDefaults: preferences.appSettings.terminalQuickLaunchDefaults,
    handleOpenWorkspaceBrowser: centerTabs.handleOpenWorkspaceBrowser
  });
  const sessionFocusCommands = useWorkspaceSessionFocusCommands({
    setUiState,
    normalizeSnapshot
  });
  const noopDeleteWorkspaceSplitView = useCallback(async (): Promise<boolean> => false, []);
  const preLaunchKeyboardShortcutActions = useMemo((): ShortcutActionMap => {
    const ignoreFileEditorStateUpdate: Dispatch<SetStateAction<FileEditorState | null>> = () => undefined;

    return buildKeyboardShortcutActions({
      activeWorkspaceContentTab: null,
      appSettingsTerminalQuickLaunchDefaults: preferences.appSettings.terminalQuickLaunchDefaults,
      closeAiChatTab: centerTabs.closeAiChatTab,
      closeBrowserTab: browserTabs.closeBrowserTab,
      closeForgeViewerTab: centerTabs.closeForgeViewerTab,
      createTerminalWithStatus,
      defaultTerminalShellId,
      deleteWorkspaceSplitViewById: noopDeleteWorkspaceSplitView,
      fileEditorState: null,
      focusLocalTerminalDock,
      handleOpenWorkspaceBrowser: centerTabs.handleOpenWorkspaceBrowser,
      isCenterDiffExpanded: false,
      isCenterFullDiffExpanded: false,
      openSettingsPage: navigation.openSettingsPage,
      openStartupDependenciesDialog: dialogs.openStartupDependenciesDialog,
      sessionFocusCommands,
      sessionSurfaceSplitViews: [],
      safely,
      selectedChange: null,
      setActiveView,
      setActiveWorkspaceContentTab,
      setFileEditorState: ignoreFileEditorStateUpdate,
      setIsCenterDiffExpanded,
      setIsCenterFullDiffExpanded,
      setIsChangesSidebarCollapsed,
      setIsLocalTerminalDockCollapsed,
      setIsWorkspaceSidebarCollapsed,
      setWorkspaceQuickSearchRequestId,
      snapshot,
      uiCommands: {
        openAddWorkspaceDialog: uiCommands.openAddWorkspaceDialog,
        openCreateAgentDialog: uiCommands.openCreateAgentDialog,
        openCreateTerminalDialog: uiCommands.openCreateTerminalDialog,
        openKeyboardShortcutsDialog: uiCommands.openKeyboardShortcutsDialog,
        openWorkspaceSwitcherDialog: uiCommands.openWorkspaceSwitcherDialog,
        setDestroyAgentId: uiCommands.setDestroyAgentId
      },
      uiState: {
        aiChatTabs: uiState.aiChatTabs,
        browserTabs: uiState.browserTabs,
        focusedAiChatTabId: uiState.focusedAiChatTabId,
        focusedBrowserTabId: uiState.focusedBrowserTabId,
        focusedForgeViewerTabId: uiState.focusedForgeViewerTabId,
        forgeViewerTabs: uiState.forgeViewerTabs
      },
      workspaceSessionActiveViewId: null
    });
  }, [
    noopDeleteWorkspaceSplitView,
    preferences.appSettings.terminalQuickLaunchDefaults,
    centerTabs.closeAiChatTab,
    browserTabs.closeBrowserTab,
    centerTabs.closeForgeViewerTab,
    createTerminalWithStatus,
    defaultTerminalShellId,
    focusLocalTerminalDock,
    centerTabs.handleOpenWorkspaceBrowser,
    navigation.openSettingsPage,
    dialogs.openStartupDependenciesDialog,
    sessionFocusCommands,
    safely,
    setActiveView,
    setIsCenterDiffExpanded,
    setIsCenterFullDiffExpanded,
    setIsChangesSidebarCollapsed,
    setIsLocalTerminalDockCollapsed,
    setIsWorkspaceSidebarCollapsed,
    setWorkspaceQuickSearchRequestId,
    snapshot,
    uiCommands.openAddWorkspaceDialog,
    uiCommands.openCreateAgentDialog,
    uiCommands.openCreateTerminalDialog,
    uiCommands.openKeyboardShortcutsDialog,
    uiCommands.openWorkspaceSwitcherDialog,
    uiCommands.setDestroyAgentId,
    uiState.aiChatTabs,
    uiState.browserTabs,
    uiState.focusedAiChatTabId,
    uiState.focusedBrowserTabId,
    uiState.focusedForgeViewerTabId,
    uiState.forgeViewerTabs
  ]);
  const toolInstallFlows = useAppToolInstallFlows({
    windowPlatform: bootstrap.windowUiState.platform,
    installCommandDrafts: uiState.installCommandDrafts,
    setUiState,
    effectiveStartupDependencyReport: dialogs.effectiveStartupDependencyReport,
    openStartupDependenciesDialog: dialogs.openStartupDependenciesDialog,
    safely,
    runWithStatus: snapshotCommands.runWithStatus,
    setActiveView,
    showToast,
    captureError
  });
  const loadingFooter = <AppStatusBar entries={statusEntries} />;
  const onboardingFooter = (
    <AppStatusBar
      entries={statusEntries}
      tools={snapshot?.agentCatalog ?? []}
      agentSkillCatalogs={snapshot?.agentSkillCatalogs ?? []}
      onInstallTool={toolInstallFlows.installStatusBarTool}
      onSwitchToolAccount={toolInstallFlows.switchStatusBarToolAccount}
      onOpenSkillsSettings={() => navigation.openSettingsPage("skills")}
    />
  );
  const { shouldRenderPreLaunch, preLaunchViewProps } = useAppPreLaunchViewProps({
    isOnboardingOpen: dialogs.isOnboardingOpen,
    statusBar,
    windowUiState: bootstrap.windowUiState,
    useMacTitleBarChrome,
    themeMode: preferences.themeMode,
    resolvedTheme: preferences.resolvedTheme,
    toggleTheme: preferences.toggleTheme,
    toggleSettingsPage: navigation.toggleSettingsPage,
    setUiState,
    uiCommands,
    handleSubmitIssue: issueReporter.handleSubmitIssue,
    installedIdes: bootstrap.installedIdes,
    isLoadingInstalledIdes: bootstrap.isLoadingInstalledIdes,
    defaultIdeId: preferences.defaultIdeId,
    openAddWorkspaceModal: workspaceLifecycle.openAddWorkspaceModal,
    openStartupDependenciesDialog: dialogs.openStartupDependenciesDialog,
    linuxUpdateStatus: linuxUpdateNotice.linuxUpdateStatus,
    handleCopyLinuxUpdateCommand,
    handleOpenLinuxRelease,
    dismissLinuxUpdateNotice: linuxUpdateNotice.dismissLinuxUpdateNotice,
    activeView,
    safely,
    setActiveView,
    setIsLocalTerminalDockCollapsed,
    focusLocalTerminalDock,
    keyboardShortcutActions: preLaunchKeyboardShortcutActions,
    defaultTerminalShellId,
    appSettings: preferences.appSettings,
    effectiveStartupDependencyReport: dialogs.effectiveStartupDependencyReport,
    isStartupDependencyDialogBusy: dialogs.isStartupDependencyDialogBusy,
    startupDependencyInstallTargetId: dialogs.startupDependencyInstallTargetId,
    startupDependencyInstallErrorMessage: dialogs.startupDependencyInstallErrorMessage,
    uiState,
    isRefreshingOnboardingTools: toolInstallFlows.isRefreshingOnboardingTools,
    isAddingWorkspace,
    accentColor: preferences.accentColor,
    userDisplayName: preferences.userDisplayName,
    updateThemeMode: preferences.updateThemeMode,
    updateAccentColor: preferences.updateAccentColor,
    updateHardwareAccelerationEnabled: preferences.updateHardwareAccelerationEnabled,
    updateWorkspaceStateStorageMode: preferences.updateWorkspaceStateStorageMode,
    updateDefaultIde: preferences.updateDefaultIde,
    updateUserDisplayName: preferences.updateUserDisplayName,
    installStartupDependencyWithRefresh: dialogs.installStartupDependencyWithRefresh,
    copyStartupDependencyInstructions: dialogs.copyStartupDependencyInstructions,
    reloadStartupDependencyReport: dialogs.reloadStartupDependencyReport,
    refreshOnboardingTools: toolInstallFlows.refreshOnboardingTools,
    installOnboardingTool: toolInstallFlows.installOnboardingTool,
    setOnboardingToolEnabled: toolInstallFlows.setOnboardingToolEnabled,
    completeOnboarding: dialogs.completeOnboarding,
    loadingFooter,
    onboardingFooter,
    handleChooseLocalWorkspace: workspaceLifecycle.handleChooseLocalWorkspace,
    normalizeSnapshot,
    dismissWorkspaceLoading: workspaceLoading.dismissWorkspaceLoading,
    shouldShowStartupDependenciesDialog: dialogs.shouldShowStartupDependenciesDialog,
    simulatedMissingDependencyIds: dialogs.simulatedMissingDependencyIds,
    handleStartupDependenciesDialogOpenChange: dialogs.handleStartupDependenciesDialogOpenChange,
    toggleSimulatedMissingDependency: dialogs.toggleSimulatedMissingDependency,
    clearSimulatedMissingDependencies: dialogs.clearSimulatedMissingDependencies,
    handleOpenWorkspaceBrowser: centerTabs.handleOpenWorkspaceBrowser,
    handleOpenRecentWorkspace: workspaceLifecycle.handleOpenRecentWorkspace
  });
  const isDarwinPlatform = bootstrap.windowUiState.platform === "darwin";
  const preLaunchTitleBarForMacMenu =
    shouldRenderPreLaunch && preLaunchViewProps
      ? preLaunchViewProps.isOnboardingOpen && preLaunchViewProps.onboardingTitleBarProps
        ? preLaunchViewProps.onboardingTitleBarProps
        : preLaunchViewProps.loadingTitleBarProps
      : null;
  const preLaunchMacMenuPayload = useMemo(() => {
    if (!isDarwinPlatform || !preLaunchTitleBarForMacMenu || !preLaunchViewProps) {
      return null;
    }

    return buildMacApplicationMenuSyncPayload({
      phase: "pre-launch",
      hasActiveWorkspace: preLaunchTitleBarForMacMenu.hasActiveWorkspace,
      canOpenProjectInIde: preLaunchTitleBarForMacMenu.canOpenProjectInIde,
      activeProjectRoot: preLaunchViewProps.snapshot?.project?.rootPath ?? null,
      preferredIde: preLaunchTitleBarForMacMenu.preferredIde,
      installedIdes: preLaunchTitleBarForMacMenu.installedIdes,
      defaultIdeId: preLaunchTitleBarForMacMenu.defaultIdeId,
      recentWorkspaces: preLaunchTitleBarForMacMenu.recentWorkspaces
    });
  }, [isDarwinPlatform, preLaunchTitleBarForMacMenu, preLaunchViewProps]);
  const preLaunchMacMenuHandlers = useMemo((): MacApplicationMenuActionHandlers | null => {
    if (!preLaunchTitleBarForMacMenu) {
      return null;
    }

    const titleBar = preLaunchTitleBarForMacMenu;
    return {
      addWorkspace: titleBar.onAddWorkspace,
      addRemoteWorkspace: titleBar.onAddRemoteWorkspace,
      openInIde: (ideId) => {
        titleBar.onOpenProjectInIde(ideId);
      },
      newTerminal: titleBar.onCreateTerminal,
      newAgent: titleBar.onCreateAgent,
      newBrowser: titleBar.onCreateBrowser,
      refreshWorkspace: titleBar.onRefreshWorkspace,
      closeWorkspace: titleBar.onCloseWorkspace,
      openRecentWorkspace: titleBar.onOpenRecentWorkspace,
      toggleWorkspaceSidebar: titleBar.onToggleWorkspaceSidebar,
      toggleChangesSidebar: titleBar.onToggleChangesSidebar,
      toggleLocalTerminalDock: titleBar.onToggleLocalTerminalDock,
      focusLocalTerminalDock: titleBar.onFocusLocalTerminalDock,
      focusPreviousSessionTab: titleBar.onFocusPreviousSessionTab,
      focusNextSessionTab: titleBar.onFocusNextSessionTab,
      openKeyboardShortcuts: titleBar.onOpenKeyboardShortcuts,
      openStartupDependencies: titleBar.onOpenStartupDependencies,
      submitIssue: titleBar.onSubmitIssue,
      openAbout: titleBar.onOpenAbout
    };
  }, [preLaunchTitleBarForMacMenu]);
  useMacApplicationMenuBridge({
    enabled: isDarwinPlatform && shouldRenderPreLaunch,
    payload: preLaunchMacMenuPayload,
    handlers: preLaunchMacMenuHandlers
  });
  const preRender = shouldRenderPreLaunch && preLaunchViewProps ? (
    <AppPreLaunchView {...preLaunchViewProps} />
  ) : null;

  if (shouldRenderPreLaunch) {
    return (
      <ToastProvider swipeDirection="right">
        <PreLaunchKeyboardShortcutsRegistrar actions={preLaunchKeyboardShortcutActions} />
        {preRender}
        <AppToastStack toasts={toasts} onDismiss={dismissToast} />
        <ToastViewport />
      </ToastProvider>
    );
  }

  if (!snapshot) {
    return null;
  }

  return (
    <SignedInAppRoot
      storedWorkspaceContentState={storedWorkspaceContentState}
      preferences={preferences}
      bootstrap={bootstrap}
      autoUpdate={autoUpdate}
      aiModels={aiModels}
      toolInstallFlows={toolInstallFlows}
      navigation={navigation}
      browserTabs={browserTabs}
      centerTabs={centerTabs}
      workspaceLifecycle={workspaceLifecycle}
      workspaceLoading={workspaceLoading}
      snapshotCommands={snapshotCommands}
      shellFrame={shellFrame}
      issueReporter={issueReporter}
      linuxUpdateNotice={linuxUpdateNotice}
      uiCommands={uiCommands}
      safely={safely}
      refreshSnapshot={refreshSnapshot}
      captureError={captureError}
      clearCapturedError={clearCapturedError}
      defaultTerminalShellId={defaultTerminalShellId}
      setDefaultTerminalShellId={setDefaultTerminalShellId}
      normalizeSnapshot={normalizeSnapshot}
      addWorkspaceBaselineSignatureRef={addWorkspaceBaselineSignatureRef}
      finishAddingWorkspace={finishAddingWorkspace}
    />
  );
}

function PreLaunchKeyboardShortcutsRegistrar({ actions }: { actions: ShortcutActionMap }): null {
  useKeyboardShortcuts(SHORTCUT_DEFINITIONS, actions);
  return null;
}
