import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import {
  buildPreLaunchAboutDialogProps,
  buildPreLaunchAddWorkspaceDialogProps,
  buildPreLaunchKeyboardShortcutsDialogProps,
  buildPreLaunchRemoteWorkspaceDialogProps,
  buildPreLaunchStartupDependenciesDialogProps,
  buildPreLaunchTitleBarCommonInput,
  buildPreLaunchTopBannersProps
} from "@/components/app/logic/buildAppPreLaunchViewProps";
import { buildOnboardingDialogProps } from "@/components/app/logic/buildOnboardingDialogProps";
import {
  buildPreLaunchTitleBarLoadingProps,
  buildPreLaunchTitleBarOnboardingProps
} from "@/components/app/logic/buildPreLaunchTitleBarProps";
import type { StatusBarContextValue } from "@/components/app/logic/statusBarContext";
import type { AccentColor, AppView, ResolvedTheme, ThemeMode, UiState, WindowUiState } from "@/components/app/types";
import type { AppPreLaunchViewProps } from "@/components/app/types/appPreLaunchView.types";
import type { ShortcutActionMap } from "@/components/app/types/workflow.types";
import type { AppSettings, AppState, InstalledIde } from "@shared/appTypes";
import type { StartupDependency, StartupDependencyId, StartupDependencyReport } from "@shared/types/startupDependency.types";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useMemo } from "react";

type UseAppPreLaunchViewPropsArgs = {
  isOnboardingOpen: boolean;
  statusBar: StatusBarContextValue;
  windowUiState: WindowUiState;
  useMacTitleBarChrome: boolean;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
  toggleSettingsPage: () => void;
  setUiState: Dispatch<SetStateAction<UiState>>;
  uiCommands: AppUiCommands;
  handleSubmitIssue: () => void;
  installedIdes: InstalledIde[];
  isLoadingInstalledIdes: boolean;
  defaultIdeId: string | null;
  openAddWorkspaceModal: () => Promise<AppState | null>;
  openStartupDependenciesDialog: () => void;
  openOnboardingFlow: () => void;
  linuxUpdateStatus: AppPreLaunchViewProps["topBannersProps"]["linuxUpdateStatus"];
  handleCopyLinuxUpdateCommand: () => void;
  handleOpenLinuxRelease: () => void;
  dismissLinuxUpdateNotice: () => void;
  activeView: AppView;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  setIsLocalTerminalDockCollapsed: Dispatch<SetStateAction<boolean>>;
  focusLocalTerminalDock: () => Promise<void>;
  keyboardShortcutActions: ShortcutActionMap;
  defaultTerminalShellId: string | null;
  appSettings: AppSettings;
  effectiveStartupDependencyReport: StartupDependencyReport | null;
  isStartupDependencyDialogBusy: boolean;
  startupDependencyInstallTargetId: StartupDependencyId | null;
  startupDependencyInstallErrorMessage: string | null;
  uiState: UiState;
  isRefreshingOnboardingTools: boolean;
  isAddingWorkspace: boolean;
  accentColor: AccentColor;
  userDisplayName: string;
  updateThemeMode: (mode: ThemeMode) => void;
  updateAccentColor: (accentColor: AccentColor) => void;
  updateHardwareAccelerationEnabled: (enabled: boolean) => Promise<void>;
  updateWorkspaceStateStorageMode: (mode: AppSettings["workspaceStateStorageMode"]) => Promise<void>;
  updateDefaultIde: (ideId: string | null) => void;
  updateUserDisplayName: (displayName: string) => void;
  installStartupDependencyWithRefresh: (dependencyId: StartupDependencyId) => Promise<void>;
  copyStartupDependencyInstructions: (dependency: StartupDependency) => Promise<void>;
  reloadStartupDependencyReport: () => Promise<void>;
  refreshOnboardingTools: () => Promise<void>;
  installOnboardingTool: (toolId: string) => Promise<void>;
  setOnboardingToolEnabled: (toolId: string, enabled: boolean) => Promise<void>;
  completeOnboarding: () => void;
  loadingFooter: ReactElement;
  onboardingFooter: ReactElement;
  handleChooseLocalWorkspace: () => Promise<void>;
  normalizeSnapshot: (next: AppState) => AppState;
  dismissWorkspaceLoading: () => void;
  shouldShowStartupDependenciesDialog: boolean;
  simulatedMissingDependencyIds: StartupDependencyId[];
  handleStartupDependenciesDialogOpenChange: (open: boolean) => void;
  toggleSimulatedMissingDependency: (dependencyId: StartupDependencyId) => void;
  clearSimulatedMissingDependencies: () => void;
  handleOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  handleOpenRecentWorkspace: (projectRoot: string, projectName: string) => Promise<void>;
};

export function useAppPreLaunchViewProps(args: UseAppPreLaunchViewPropsArgs): {
  shouldRenderPreLaunch: boolean;
  preLaunchViewProps: AppPreLaunchViewProps | null;
} {
  const snapshot = useCanonicalAppSnapshot();
  const {
    isOnboardingOpen,
    statusBar,
    windowUiState,
    useMacTitleBarChrome,
    themeMode,
    resolvedTheme,
    toggleTheme,
    toggleSettingsPage,
    setUiState,
    uiCommands,
    handleSubmitIssue,
    installedIdes,
    isLoadingInstalledIdes,
    defaultIdeId,
    openAddWorkspaceModal,
    openStartupDependenciesDialog,
    openOnboardingFlow,
    linuxUpdateStatus,
    handleCopyLinuxUpdateCommand,
    handleOpenLinuxRelease,
    dismissLinuxUpdateNotice,
    activeView,
    safely,
    setActiveView,
    setIsLocalTerminalDockCollapsed,
    focusLocalTerminalDock,
    keyboardShortcutActions,
    defaultTerminalShellId,
    appSettings,
    effectiveStartupDependencyReport,
    isStartupDependencyDialogBusy,
    startupDependencyInstallTargetId,
    startupDependencyInstallErrorMessage,
    uiState,
    isRefreshingOnboardingTools,
    isAddingWorkspace,
    accentColor,
    userDisplayName,
    updateThemeMode,
    updateAccentColor,
    updateHardwareAccelerationEnabled,
    updateWorkspaceStateStorageMode,
    updateDefaultIde,
    updateUserDisplayName,
    installStartupDependencyWithRefresh,
    copyStartupDependencyInstructions,
    reloadStartupDependencyReport,
    refreshOnboardingTools,
    installOnboardingTool,
    setOnboardingToolEnabled,
    completeOnboarding,
    loadingFooter,
    onboardingFooter,
    handleChooseLocalWorkspace,
    normalizeSnapshot,
    dismissWorkspaceLoading,
    shouldShowStartupDependenciesDialog,
    simulatedMissingDependencyIds,
    handleStartupDependenciesDialogOpenChange,
    toggleSimulatedMissingDependency,
    clearSimulatedMissingDependencies,
    handleOpenWorkspaceBrowser,
    handleOpenRecentWorkspace
  } = args;

  return useMemo(() => {
    const shouldRenderPreLaunch = !snapshot || isOnboardingOpen;
    if (!shouldRenderPreLaunch) {
      return { shouldRenderPreLaunch, preLaunchViewProps: null };
    }

    const preLaunchTitleBarCommonInput = buildPreLaunchTitleBarCommonInput({
      windowUiState,
      useMacTitleBarChrome,
      themeMode,
      resolvedTheme,
      onToggleTheme: toggleTheme,
      onOpenSettings: toggleSettingsPage,
      onOpenKeyboardShortcuts: uiCommands.openKeyboardShortcutsDialog,
      onOpenAbout: uiCommands.openAboutDialog,
      onSubmitIssue: handleSubmitIssue,
      installedIdes,
      isLoadingInstalledIdes,
      defaultIdeId,
      onAddWorkspace: () => {
        uiCommands.openAddWorkspaceDialog();
      },
      onAddRemoteWorkspace: uiCommands.openRemoteWorkspaceDialog,
      onOpenStartupDependencies: openStartupDependenciesDialog,
      onOpenOnboarding: openOnboardingFlow
    });

    const preLaunchViewProps: AppPreLaunchViewProps = {
      snapshot,
      isOnboardingOpen,
      statusBar,
      loadingTitleBarProps: buildPreLaunchTitleBarLoadingProps(preLaunchTitleBarCommonInput, activeView === "settings"),
      onboardingTitleBarProps: snapshot
        ? buildPreLaunchTitleBarOnboardingProps(preLaunchTitleBarCommonInput, {
            snapshot,
            safely,
            setActiveView,
            uiCommands,
            setIsLocalTerminalDockCollapsed,
            focusLocalTerminalDock,
            focusPreviousSessionTab: () => {
              keyboardShortcutActions["focus-previous-session-tab"]();
            },
            focusNextSessionTab: () => {
              keyboardShortcutActions["focus-next-session-tab"]();
            },
            defaultTerminalShellId,
            terminalQuickLaunchDefaults: appSettings.terminalQuickLaunchDefaults,
            handleOpenWorkspaceBrowser,
            handleOpenRecentWorkspace
          })
        : null,
      topBannersProps: buildPreLaunchTopBannersProps({
        linuxUpdateStatus,
        onCopyLinuxUpdateCommand: handleCopyLinuxUpdateCommand,
        onOpenLinuxRelease: handleOpenLinuxRelease,
        onDismissLinuxUpdate: dismissLinuxUpdateNotice
      }),
      loadingOnboardingDialogProps: buildOnboardingDialogProps({
        mode: "loading",
        snapshot: null,
        effectiveStartupDependencyReport,
        isStartupDependencyDialogBusy,
        startupDependencyInstallTargetId,
        startupDependencyInstallErrorMessage,
        installCommandDrafts: uiState.installCommandDrafts,
        isRefreshingOnboardingTools,
        isAddingWorkspace,
        themeMode,
        accentColor,
        appSettings,
        installedIdes,
        defaultIdeId,
        userDisplayName,
        setInstallCommandDraft: uiCommands.setInstallCommandDraft,
        updateThemeMode,
        updateAccentColor,
        updateHardwareAccelerationEnabled,
        updateWorkspaceStateStorageMode,
        updateDefaultIde,
        updateUserDisplayName,
        installStartupDependencyWithRefresh,
        copyStartupDependencyInstructions,
        reloadStartupDependencyReport,
        refreshOnboardingTools,
        installOnboardingTool,
        setOnboardingToolEnabled,
        openAddWorkspaceModal,
        completeOnboarding
      }),
      onboardingOnboardingDialogProps: snapshot
        ? buildOnboardingDialogProps({
            mode: "onboarding",
            snapshot,
            effectiveStartupDependencyReport,
            isStartupDependencyDialogBusy,
            startupDependencyInstallTargetId,
            startupDependencyInstallErrorMessage,
            installCommandDrafts: uiState.installCommandDrafts,
            isRefreshingOnboardingTools,
            isAddingWorkspace,
            themeMode,
            accentColor,
            appSettings,
            installedIdes,
            defaultIdeId,
            userDisplayName,
            setInstallCommandDraft: uiCommands.setInstallCommandDraft,
            updateThemeMode,
            updateAccentColor,
            updateHardwareAccelerationEnabled,
            updateWorkspaceStateStorageMode,
            updateDefaultIde,
            updateUserDisplayName,
            installStartupDependencyWithRefresh,
            copyStartupDependencyInstructions,
            reloadStartupDependencyReport,
            refreshOnboardingTools,
            installOnboardingTool,
            setOnboardingToolEnabled,
            openAddWorkspaceModal,
            completeOnboarding
          })
        : null,
      startupDependenciesDialogProps: buildPreLaunchStartupDependenciesDialogProps({
        shouldShowStartupDependenciesDialog,
        effectiveStartupDependencyReport,
        isStartupDependencyDialogBusy,
        startupDependencyInstallTargetId,
        startupDependencyInstallErrorMessage,
        simulatedMissingDependencyIds,
        handleStartupDependenciesDialogOpenChange,
        installStartupDependencyWithRefresh,
        copyStartupDependencyInstructions,
        toggleSimulatedMissingDependency,
        clearSimulatedMissingDependencies,
        reloadStartupDependencyReport
      }),
      loadingFooter,
      onboardingFooter,
      addWorkspaceDialogProps: buildPreLaunchAddWorkspaceDialogProps({
        uiState,
        uiCommands,
        onChooseLocalWorkspace: () => {
          void handleChooseLocalWorkspace();
        }
      }),
      remoteWorkspaceDialogProps: buildPreLaunchRemoteWorkspaceDialogProps({
        uiState,
        setUiState,
        normalizeSnapshot,
        dismissWorkspaceLoading,
        uiCommands
      }),
      keyboardShortcutsDialogProps: buildPreLaunchKeyboardShortcutsDialogProps({
        uiState,
        windowUiState,
        uiCommands
      }),
      aboutDialogProps: buildPreLaunchAboutDialogProps({
        uiState,
        uiCommands,
        focusLocalTerminalDock
      })
    };

    return {
      shouldRenderPreLaunch,
      preLaunchViewProps
    };
  }, [
    accentColor,
    activeView,
    appSettings,
    clearSimulatedMissingDependencies,
    completeOnboarding,
    copyStartupDependencyInstructions,
    defaultIdeId,
    defaultTerminalShellId,
    dismissLinuxUpdateNotice,
    dismissWorkspaceLoading,
    effectiveStartupDependencyReport,
    focusLocalTerminalDock,
    handleChooseLocalWorkspace,
    handleCopyLinuxUpdateCommand,
    handleOpenLinuxRelease,
    handleOpenRecentWorkspace,
    handleOpenWorkspaceBrowser,
    handleStartupDependenciesDialogOpenChange,
    handleSubmitIssue,
    installedIdes,
    installOnboardingTool,
    installStartupDependencyWithRefresh,
    isAddingWorkspace,
    isLoadingInstalledIdes,
    isOnboardingOpen,
    isRefreshingOnboardingTools,
    isStartupDependencyDialogBusy,
    keyboardShortcutActions,
    linuxUpdateStatus,
    loadingFooter,
    normalizeSnapshot,
    onboardingFooter,
    openAddWorkspaceModal,
    openStartupDependenciesDialog,
    openOnboardingFlow,
    reloadStartupDependencyReport,
    refreshOnboardingTools,
    resolvedTheme,
    safely,
    setActiveView,
    setIsLocalTerminalDockCollapsed,
    setOnboardingToolEnabled,
    setUiState,
    shouldShowStartupDependenciesDialog,
    simulatedMissingDependencyIds,
    snapshot,
    startupDependencyInstallErrorMessage,
    startupDependencyInstallTargetId,
    statusBar,
    themeMode,
    toggleSettingsPage,
    toggleSimulatedMissingDependency,
    toggleTheme,
    uiCommands,
    uiState,
    updateAccentColor,
    updateDefaultIde,
    updateHardwareAccelerationEnabled,
    updateThemeMode,
    updateUserDisplayName,
    updateWorkspaceStateStorageMode,
    useMacTitleBarChrome,
    userDisplayName,
    windowUiState
  ]);
}
