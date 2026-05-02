import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { AppView, ResolvedTheme, StatusBarEntry, UiState, WindowUiState } from "@/components/app/types";
import type { AppCenterContentValueArgs } from "@/components/app/types/appCenterContentValue.types";
import type { AppChromeShellComposeSlice } from "@/components/app/types/appChromeShellComposeSlice.types";
import type { UseWorkspaceContentControllerResult } from "@/components/app/types/appHooks.types";
import type { AppModalDialogsBuildDeps } from "@/components/app/types/appModalDialogsBuild.types";
import type { ChangesPanelSectionBuildDeps } from "@/components/app/types/changesPanelSectionBuild.types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { BuildSettingsRuntimeValueDeps } from "@/components/app/types/settingsRuntimeBuild.types";
import type { WorkspaceQuickSearchPick, WorkspaceQuickSearchSource } from "@/components/app/types/titlebarWorkspaceSearch.types";
import type { ShortcutActionMap } from "@/components/app/types/workflow.types";
import type { WorkspaceSidebarBuildDeps } from "@/components/app/types/workspaceSidebarBuild.types";
import type { AppSettings, AppState, CreateTerminalPayload } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

/** Shared shell state passed to several slice builders. */
export type AppShellSignedInCoreSources = {
  snapshot: AppState;
  uiState: UiState;
  setUiState: Dispatch<SetStateAction<UiState>>;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  captureError: (error: unknown) => void;
  normalizeSnapshot: (next: AppState) => AppState;
  dismissWorkspaceLoading: () => void;
  appSettings: AppSettings;
  resolvedTheme: ResolvedTheme;
  windowUiState: WindowUiState;
  activeView: AppView;
  openSettingsPage: (group?: SettingsGroup) => void;
  resolveInstallCommand: (toolId: string, template: string) => string;
  clearCapturedError: () => void;
  createTerminalWithStatus: (payload: CreateTerminalPayload) => Promise<AppState | null>;
  openAddRemoteWorkspaceModal: () => void;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  uiCommands: AppUiCommands;
};

export type AppShellSignedInWorkspaceCatalogSources = {
  workspaceTasks: AppCenterContentValueArgs["workspaceTasks"];
  workspaceSpecs: AppCenterContentValueArgs["workspaceSpecs"];
  workspaceNotes: AppCenterContentValueArgs["workspaceNotes"];
  workspaceTaskBoards: AppCenterContentValueArgs["workspaceTaskBoards"];
  updateWorkspaceTaskBoard: AppCenterContentValueArgs["updateWorkspaceTaskBoard"];
  allWorkspaceTasks: WorkspaceSidebarBuildDeps["workspaceTasks"];
  allWorkspaceSpecs: WorkspaceSidebarBuildDeps["workspaceSpecs"];
  allWorkspaceNotes: WorkspaceSidebarBuildDeps["workspaceNotes"];
};

export type AppShellSignedInForgeSources = Pick<
  AppCenterContentValueArgs,
  | "forgeOverview"
  | "forgeWorkItemDetail"
  | "forgeWorkItemDetailErrorMessage"
  | "isLoadingForgeWorkItemDetail"
  | "isPerformingForgeWorkItemAction"
  | "isPostingForgeWorkItemComment"
  | "addForgeWorkItemComment"
  | "loadForgeWorkItemDetail"
  | "performForgeWorkItemAction"
  | "refreshForgeOverview"
  | "resolveGitlabForgeRepoOverride"
  | "handleSpawnForgeIssueAgent"
  | "focusedForgeViewerTab"
> &
  Pick<ChangesPanelSectionBuildDeps, "forgeBranchPullRequestStatus" | "isLoadingForgeOverview"> & {
    handleCreateForgePullRequest: AppModalDialogsBuildDeps["handleCreateForgePullRequest"];
  };

export type AppShellSignedInForgeWorkItemMutatorSources = Pick<
  ChangesPanelSectionBuildDeps,
  "setForgeWorkItemDetail" | "setForgeWorkItemDetailErrorMessage"
>;

export type AppShellSignedInVercelSources = Pick<
  ChangesPanelSectionBuildDeps,
  | "linkCurrentWorkspaceToVercelProject"
  | "refreshVercelDeployments"
  | "refreshVercelProjects"
  | "linkedVercelProject"
  | "suggestedVercelProject"
  | "unlinkCurrentWorkspaceFromVercelProject"
  | "vercelAccountLabel"
  | "vercelDeployments"
  | "vercelDeploymentsErrorMessage"
  | "vercelProjects"
  | "vercelProjectsErrorMessage"
  | "vercelToken"
  | "redeployVercelDeployment"
  | "redeployingVercelDeploymentId"
> & {
  vercelDeploymentsLoading: ChangesPanelSectionBuildDeps["vercelDeploymentsLoading"];
  vercelProjectsLoading: ChangesPanelSectionBuildDeps["vercelProjectsLoading"];
};

export type AppShellSignedInGitBranchSources = {
  activeBranch: string;
  parentRepoBranch: string;
};

export type AppShellSignedInSessionSurfaceSources = Pick<
  AppCenterContentValueArgs,
  | "activeGridColumns"
  | "activeGridRows"
  | "activeView"
  | "activeSplitViewCollection"
  | "activeWorkspaceContentTab"
  | "addFocusedLabel"
  | "canAddCurrentItem"
  | "fileEditorState"
  | "focusedAgent"
  | "focusedAiChatTab"
  | "focusedBrowserTab"
  | "focusedForgeViewerTab"
  | "focusedTerminal"
  | "focusedWorkspace"
  | "selectedChange"
  | "isCenterDiffExpanded"
  | "isCenterFullDiffExpanded"
  | "setActiveWorkspaceContentTab"
  | "setFileEditorState"
  | "setIsCenterDiffExpanded"
  | "setIsCenterFullDiffExpanded"
  | "splitViewsErrorMessage"
  | "splitViewsLoading"
  | "shouldShowProjectSelectorScreen"
  | "terminalFontId"
  | "terminalThemeId"
  | "workspaceSessionViews"
>;

export type AppShellSignedInCenterTabsSources = Pick<
  AppCenterContentValueArgs,
  | "closeAiChatTab"
  | "closeBrowserTab"
  | "closeForgeViewerTab"
  | "focusAiChatTab"
  | "focusBrowserTab"
  | "focusForgeViewerTab"
  | "handleOpenWorkspaceBrowser"
  | "openAiChat"
  | "openForgeViewer"
  | "updateAiChatTabMessages"
  | "updateAiChatTabReasoningMode"
  | "updateAiChatTabTitle"
  | "updateBrowserTab"
  | "saveFileEditor"
>;

export type AppShellSignedInAiModelSources = Pick<
  AppCenterContentValueArgs,
  "aiModelLoading" | "aiModelOptions" | "handleSelectAiChatProviderModel"
> &
  Pick<BuildSettingsRuntimeValueDeps, "aiModelError" | "refreshAiModels">;

export type AppShellSignedInModalExtrasSources = Pick<
  AppModalDialogsBuildDeps,
  | "agentPendingDestroy"
  | "setForgeOAuthDevicePrompt"
  | "setIsBrowserCookieImportPromptOpen"
  | "setSelectedChromeCookieProfileId"
  | "setIsCreatePullRequestDialogOpen"
  | "handleCreateAgentFromDialog"
  | "forgeOAuthDevicePrompt"
  | "shouldShowStartupDependenciesDialog"
  | "effectiveStartupDependencyReport"
  | "isStartupDependencyDialogBusy"
  | "startupDependencyInstallTargetId"
  | "startupDependencyInstallErrorMessage"
  | "simulatedMissingDependencyIds"
  | "handleStartupDependenciesDialogOpenChange"
  | "installStartupDependencyWithRefresh"
  | "copyStartupDependencyInstructions"
  | "toggleSimulatedMissingDependency"
  | "clearSimulatedMissingDependencies"
  | "reloadStartupDependencyReport"
  | "workspaceTerminalPresetProject"
  | "saveWorkspaceTerminalPresets"
  | "isCreatePullRequestDialogOpen"
  | "handleChooseLocalWorkspace"
  | "isLinuxAptSetupDialogOpen"
  | "linuxAptSetupStatus"
  | "isInstallingLinuxAptUpdates"
  | "linuxAptSetupErrorMessage"
  | "closeLinuxAptSetupDialog"
  | "installLinuxAptUpdates"
  | "handleCopyLinuxAptManualCommands"
  | "isBrowserCookieImportPromptOpen"
  | "chromeCookieProfiles"
  | "selectedChromeCookieProfileId"
  | "isLoadingChromeCookieProfiles"
  | "isImportingChromeBrowserData"
  | "updateBrowserPreferences"
  | "loadChromeCookieProfiles"
  | "runChromeBrowserDataImport"
  | "isAnalyticsConsentDialogOpen"
  | "allowAnalyticsConsent"
  | "declineAnalyticsConsent"
  | "workspaceSwitcherEntries"
>;

export type AppShellSignedInWorkspaceSidebarRestSources = Omit<
  WorkspaceSidebarBuildDeps,
  keyof UseWorkspaceContentControllerResult
>;

export type AppShellSignedInChangesFileHandlersSources = Pick<
  ChangesPanelSectionBuildDeps,
  "fileHandlers" | "fileEditorActivePath" | "openFileEditor" | "openForgeViewer" | "openCreateAgentDialog"
>;

export type AppShellSignedInChromeShellSources = {
  keyboardShortcutActions: ShortcutActionMap;
  workspaceQuickSearchSource: WorkspaceQuickSearchSource;
  workspaceQuickSearchRequestId: number;
  workspaceQuickSearchOpenShortcutLabel: string;
  handleWorkspaceQuickSearchPick: (pick: WorkspaceQuickSearchPick) => void;
  focusLocalTerminalDock: () => Promise<void>;
  activeChangesPanelTab: ChangesPanelSectionBuildDeps["activeChangesPanelTab"];
  setActiveChangesPanelTab: ChangesPanelSectionBuildDeps["setActiveChangesPanelTab"];
  canOpenProjectInIde: boolean;
  preferredIde: AppChromeShellComposeSlice["titleBar"]["preferredIde"];
  handleOpenProjectInIde: AppChromeShellComposeSlice["titleBar"]["handleOpenProjectInIde"];
  handleOpenRecentWorkspace: AppChromeShellComposeSlice["titleBar"]["handleOpenRecentWorkspace"];
  handleSubmitIssue: AppChromeShellComposeSlice["titleBar"]["handleSubmitIssue"];
  openCreateAgentModal: () => void;
  openWorkspaceBrowserFromTitleBar: () => void;
  openCreateTerminalModal: () => void;
  linuxUpdateStatus: AppChromeShellComposeSlice["topBanners"]["linuxUpdateStatus"];
  handleCopyLinuxUpdateCommand: AppChromeShellComposeSlice["topBanners"]["onCopyLinuxUpdateCommand"];
  handleOpenLinuxRelease: AppChromeShellComposeSlice["topBanners"]["onOpenLinuxRelease"];
  dismissLinuxUpdateNotice: AppChromeShellComposeSlice["topBanners"]["onDismissLinuxUpdate"];
  statusEntries: StatusBarEntry[];
  installStatusBarTool: AppChromeShellComposeSlice["statusBarChrome"]["onInstallTool"];
  switchStatusBarToolAccount: AppChromeShellComposeSlice["statusBarChrome"]["onSwitchToolAccount"];
  toggleSettingsPage: () => void;
  openStartupDependenciesDialog: () => void;
  openAddWorkspaceModal: () => Promise<AppState | null>;
  defaultIdeId: string | null;
  installedIdes: AppChromeShellComposeSlice["titleBar"]["installedIdes"];
  isLoadingInstalledIdes: boolean;
  useMacTitleBarChrome: boolean;
  themeMode: AppChromeShellComposeSlice["titleBar"]["themeMode"];
  toggleTheme: () => void;
  isWorkspaceSidebarCollapsed: boolean;
  isChangesSidebarCollapsed: boolean;
  sidebarsSwapped: boolean;
  setIsChangesSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsWorkspaceSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsLocalTerminalDockCollapsed: Dispatch<SetStateAction<boolean>>;
  settingsGroup: SettingsGroup;
};

/**
 * Coarse bundles fed once into `assembleAppShellProviderSlices`. This is a **wiring DTO**, not an app-wide
 * context: avoid growing another “shell” wrapper on top. When a field is only used by one slice, add it to
 * that slice’s native build type (`AppCenterContentValueArgs`, `WorkspaceSidebarBuildDeps`, …) and thread it
 * through this object only until assembly can read it from the narrower type.
 */
export type AppShellSignedInAssemblySources = {
  core: AppShellSignedInCoreSources;
  workspaceCatalog: AppShellSignedInWorkspaceCatalogSources;
  /** Workspace content controller; `handleCreateAgentFromDialog` is only used by the modal slice. */
  workspaceContent: UseWorkspaceContentControllerResult;
  forge: AppShellSignedInForgeSources;
  forgeWorkItemMutators: AppShellSignedInForgeWorkItemMutatorSources;
  vercel: AppShellSignedInVercelSources;
  gitBranches: AppShellSignedInGitBranchSources;
  sessionSurface: AppShellSignedInSessionSurfaceSources;
  centerTabs: AppShellSignedInCenterTabsSources;
  aiModels: AppShellSignedInAiModelSources;
  modalExtras: AppShellSignedInModalExtrasSources;
  workspaceSidebarRest: AppShellSignedInWorkspaceSidebarRestSources;
  changesFileHandlers: AppShellSignedInChangesFileHandlersSources;
  chromeShell: AppShellSignedInChromeShellSources;
};
