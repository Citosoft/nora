import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { AppView, UiState, WindowUiState, WorkspaceTasksState } from "@/components/app/types";
import type {
  AgentSession,
  AppSettings,
  AppState,
  BrowserCookieProfileSummary,
  BrowserDataImportResult,
  CreateAgentPayload,
  CreateTerminalPayload,
  ForgeOAuthDevicePrompt,
  ForgeOverview,
  LinuxAptSetupStatus,
  ProjectSummary,
  WorkspaceSummary
} from "@shared/appTypes";
import type { StartupDependencyId, StartupDependencyReport } from "@shared/types/startupDependency.types";
import type { Dispatch, SetStateAction } from "react";

export type AppModalDialogsLinuxAptSetupStatus = Extract<LinuxAptSetupStatus, { kind: "missing" }> | null;

export type AppModalDialogsBuildDeps = {
  uiState: UiState;
  snapshot: AppState;
  workspaceTasks: WorkspaceTasksState;
  agentPendingDestroy: AgentSession | null;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  setUiState: Dispatch<SetStateAction<UiState>>;
  uiCommands: Pick<
    AppUiCommands,
    | "closeCreateAgentDialog"
    | "closeCreateTerminalDialog"
    | "setAboutDialogOpen"
    | "setAddWorkspaceDialogOpen"
    | "setCreateAgentDialogOpen"
    | "setCreateTerminalDialogOpen"
    | "setDestroyAgentDialogOpen"
    | "setDestroyAgentId"
    | "setKeyboardShortcutsDialogOpen"
    | "setRemoteWorkspaceDialogOpen"
    | "setResetWorkspacesDialogOpen"
    | "setWorkspaceSwitcherDialogOpen"
    | "setWorkspaceTerminalPresetsDialogOpen"
  >;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  setForgeOAuthDevicePrompt: Dispatch<SetStateAction<ForgeOAuthDevicePrompt | null>>;
  setIsBrowserCookieImportPromptOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedChromeCookieProfileId: Dispatch<SetStateAction<string | null>>;
  setIsCreatePullRequestDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleCreateAgentFromDialog: (payload: CreateAgentPayload, taskPath: string | null) => void;
  forgeOAuthDevicePrompt: ForgeOAuthDevicePrompt | null;
  clearCapturedError: () => void;
  shouldShowStartupDependenciesDialog: boolean;
  effectiveStartupDependencyReport: StartupDependencyReport | null;
  isStartupDependencyDialogBusy: boolean;
  startupDependencyInstallTargetId: StartupDependencyId | null;
  startupDependencyInstallErrorMessage: string | null;
  simulatedMissingDependencyIds: StartupDependencyId[];
  handleStartupDependenciesDialogOpenChange: (open: boolean) => void;
  installStartupDependencyWithRefresh: (dependencyId: StartupDependencyId) => Promise<void>;
  copyStartupDependencyInstructions: (dependencyId: StartupDependencyId) => void;
  toggleSimulatedMissingDependency: (dependencyId: StartupDependencyId) => void;
  clearSimulatedMissingDependencies: () => void;
  reloadStartupDependencyReport: () => void | Promise<void>;
  workspaceTerminalPresetProject: ProjectSummary | null;
  saveWorkspaceTerminalPresets: (projectId: string, presets: AppSettings["terminalPresets"]) => Promise<void>;
  createTerminalWithStatus: (payload: CreateTerminalPayload) => Promise<void | AppState | null>;
  activeBranch: string;
  parentRepoBranch: string;
  appSettings: AppSettings;
  forgeOverview: ForgeOverview | null;
  isCreatePullRequestDialogOpen: boolean;
  handleCreateForgePullRequest: (payload: { title: string; body: string; sourceBranch: string; baseBranch: string }) => Promise<void>;
  handleChooseLocalWorkspace: () => Promise<void>;
  openAddRemoteWorkspaceModal: () => void;
  normalizeSnapshot: (next: AppState) => AppState;
  dismissWorkspaceLoading: () => void;
  isLinuxAptSetupDialogOpen: boolean;
  linuxAptSetupStatus: AppModalDialogsLinuxAptSetupStatus;
  isInstallingLinuxAptUpdates: boolean;
  linuxAptSetupErrorMessage: string | null;
  closeLinuxAptSetupDialog: () => void;
  installLinuxAptUpdates: () => void;
  handleCopyLinuxAptManualCommands: () => void;
  isBrowserCookieImportPromptOpen: boolean;
  chromeCookieProfiles: BrowserCookieProfileSummary[];
  selectedChromeCookieProfileId: string | null;
  isLoadingChromeCookieProfiles: boolean;
  isImportingChromeBrowserData: boolean;
  updateBrowserPreferences: (
    nextBrowserSettings: Partial<
      Pick<AppSettings, "openInternalBrowserOnNewPortDetection" | "browserDataImportPromptSeen">
    >
  ) => Promise<void>;
  captureError: (error: unknown) => void;
  loadChromeCookieProfiles: () => void | Promise<void>;
  runChromeBrowserDataImport: (profileId: string) => Promise<BrowserDataImportResult | null>;
  isAnalyticsConsentDialogOpen: boolean;
  allowAnalyticsConsent: () => void;
  declineAnalyticsConsent: () => void;
  windowUiStatePlatform: WindowUiState["platform"];
  workspaceSwitcherEntries: WorkspaceSummary[];
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  focusLocalTerminalDock: () => Promise<void>;
};
