import type {
  AppView,
  BrowserTabState,
  FileEditorState,
  TaskEditorState,
  UiState,
  WorkspaceFileTreeState,
  WorkspaceNotesState,
  WorkspaceSpecsState,
  WorkspaceTasksState
} from "@/components/app/types";
import type { StatusBarContextValue, TaskCenterTaskReference } from "@/components/app/types/component.types";
import type {
  AiModelCatalogEntry,
  AiProvider,
  AppState,
  AutoUpdateStatus,
  BrowserCookieProfileSummary,
  BrowserDataImportResult,
  CreateAgentPayload,
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
  ForgeOAuthDevicePrompt,
  ForgeOverview,
  ForgeWorkItemAction,
  ForgeWorkItemDetail,
  ForgeWorkItemKind,
  VercelDeploymentSummary,
  VercelProjectSummary,
  VercelRuntimeLogEntry,
  WorkspaceTaskBoard
} from "@shared/appTypes";
import type { StartupDependencyId, StartupDependencyReport } from "@shared/types/startupDependency.types";
import type { Dispatch, SetStateAction } from "react";

export type UseStartupDependenciesArgs = {
  setUiState: Dispatch<SetStateAction<UiState>>;
};

export type UseStartupDependenciesResult = {
  isOnboardingCompleted: boolean;
  isOnboardingOpen: boolean;
  effectiveStartupDependencyReport: StartupDependencyReport | null;
  startupDependencyInstallTargetId: StartupDependencyId | null;
  startupDependencyInstallErrorMessage: string | null;
  simulatedMissingDependencyIds: StartupDependencyId[];
  missingOptionalStartupDependencyCount: number;
  isStartupDependencyDialogBusy: boolean;
  shouldShowStartupDependenciesDialog: boolean;
  reloadStartupDependencyReport: () => Promise<void>;
  installStartupDependencyWithRefresh: (dependencyId: StartupDependencyId) => Promise<void>;
  openStartupDependenciesDialog: () => void;
  handleStartupDependenciesDialogOpenChange: (open: boolean) => void;
  toggleSimulatedMissingDependency: (dependencyId: StartupDependencyId) => void;
  clearSimulatedMissingDependencies: () => void;
  completeOnboarding: () => void;
  copyStartupDependencyInstructions: (dependencyId: StartupDependencyId) => void;
};

export type UseBrowserTabsArgs = {
  browserTabs: BrowserTabState[];
  focusedBrowserTabId: string | null;
  setUiState: Dispatch<SetStateAction<UiState>>;
  openInternalBrowserOnNewPortDetection: boolean;
  onShowBrowser: () => void;
};

export type UseBrowserTabsResult = {
  openWorkspaceBrowser: (projectId: string, url?: string) => void;
  focusBrowserTab: (tabId: string) => void;
  closeBrowserTab: (tabId: string) => void;
  updateBrowserTab: (tabId: string, updater: (current: BrowserTabState) => BrowserTabState) => void;
};

export type UseWorkspaceResourcesResult = {
  workspaceFileTree: WorkspaceFileTreeState;
  workspaceTasks: WorkspaceTasksState;
  workspaceSpecs: WorkspaceSpecsState;
  workspaceNotes: WorkspaceNotesState;
  setWorkspaceFileTree: Dispatch<SetStateAction<WorkspaceFileTreeState>>;
  setWorkspaceTasks: Dispatch<SetStateAction<WorkspaceTasksState>>;
  setWorkspaceSpecs: Dispatch<SetStateAction<WorkspaceSpecsState>>;
  setWorkspaceNotes: Dispatch<SetStateAction<WorkspaceNotesState>>;
  reloadWorkspaceTasksForProject: (projectId: string) => Promise<void>;
  reloadWorkspaceSpecsForProject: (projectId: string) => Promise<void>;
  reloadWorkspaceNotesForProject: (projectId: string) => Promise<void>;
};

export type UseWorkspaceFileMutationsArgs = {
  workspaceFileTree: WorkspaceFileTreeState;
  setWorkspaceFileTree: Dispatch<SetStateAction<WorkspaceFileTreeState>>;
  fileEditorState: FileEditorState | null;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  statusBar: StatusBarContextValue;
};

export type UseWorkspaceFileMutationsResult = {
  handleCreateWorkspaceDirectory: (pathName: string) => Promise<void>;
  handleCreateWorkspaceFile: (pathName: string) => Promise<void>;
  handleRenameWorkspaceFile: (fromPath: string, toPath: string) => Promise<void>;
  handleDeleteWorkspaceFile: (pathName: string) => Promise<void>;
};

export type UseAiModelCatalogArgs = {
  apiKeys: Record<AiProvider, string>;
  modelByProvider: Record<AiProvider, string>;
  preferredProvider: AiProvider;
  updateAiPreferredProvider: (provider: AiProvider) => Promise<void>;
  updateAiModel: (provider: AiProvider, model: string) => Promise<void>;
  captureError: (error: unknown) => void;
};

export type UseAiModelCatalogResult = {
  aiModelOptions: Record<AiProvider, AiModelCatalogEntry[]>;
  aiModelLoading: Record<AiProvider, boolean>;
  aiModelError: Record<AiProvider, string | null>;
  refreshAiModels: (provider: AiProvider) => Promise<void>;
  handleSelectAiChatProviderModel: (provider: AiProvider, model: string) => Promise<void>;
};

export type UseBrowserCookieImportArgs = {
  activeView: AppView;
  focusedBrowserTabId: string | null;
  browserDataImportPromptSeen: boolean;
  updateBrowserPreferences: (next: { browserDataImportPromptSeen: boolean }) => Promise<void>;
  captureError: (error: unknown) => void;
  flashStatus: (message: string, durationMs?: number) => void;
  statusBar: StatusBarContextValue;
};

export type UseBrowserCookieImportResult = {
  chromeCookieProfiles: BrowserCookieProfileSummary[];
  selectedChromeCookieProfileId: string | null;
  isLoadingChromeCookieProfiles: boolean;
  isBrowserCookieImportPromptOpen: boolean;
  isImportingChromeBrowserData: boolean;
  setSelectedChromeCookieProfileId: Dispatch<SetStateAction<string | null>>;
  setIsBrowserCookieImportPromptOpen: Dispatch<SetStateAction<boolean>>;
  loadChromeCookieProfiles: () => void;
  runChromeBrowserDataImport: (profileId: string) => Promise<BrowserDataImportResult | null>;
  handleImportChromeBrowserData: (profileId: string) => void;
};

export type UseAppAutoUpdateArgs = {
  captureError: (error: unknown) => void;
};

export type UseAppAutoUpdateResult = {
  autoUpdateStatus: AutoUpdateStatus | null;
  isInstallingDownloadedUpdate: boolean;
  forgeOAuthDevicePrompt: ForgeOAuthDevicePrompt | null;
  setForgeOAuthDevicePrompt: Dispatch<SetStateAction<ForgeOAuthDevicePrompt | null>>;
  handleInstallDownloadedUpdate: () => void;
};

export type UseVercelIntegrationArgs = {
  activeChangesPanelTab: "git" | "files" | "forge" | "vercel";
  forgeOverview: ForgeOverview | null;
  vercelToken: string;
  vercelWorkspaceLinks: Record<string, { vercelProjectId: string; teamId: string | null }>;
  updateVercelWorkspaceLinks: (nextLinks: Record<string, { vercelProjectId: string; teamId: string | null }>) => void;
  updateVercelToken: (token: string) => void;
  updateVercelAccountLabel: (label: string | null) => void;
};

export type UseVercelIntegrationResult = {
  vercelProjects: VercelProjectSummary[];
  isLoadingVercelProjects: boolean;
  vercelProjectsErrorMessage: string | null;
  vercelDeployments: VercelDeploymentSummary[];
  isLoadingVercelDeployments: boolean;
  vercelDeploymentsErrorMessage: string | null;
  vercelRuntimeLogs: VercelRuntimeLogEntry[];
  isLoadingVercelRuntimeLogs: boolean;
  isStreamingVercelRuntimeLogs: boolean;
  vercelRuntimeLogsErrorMessage: string | null;
  redeployingVercelDeploymentId: string | null;
  linkedVercelProject: VercelProjectSummary | null;
  suggestedVercelProject: VercelProjectSummary | null;
  activeVercelLogDeployment: VercelDeploymentSummary | null;
  disconnectVercelAccount: () => void;
  refreshVercelProjects: () => Promise<void>;
  refreshVercelDeployments: () => Promise<void>;
  refreshVercelRuntimeLogs: () => Promise<void>;
  linkCurrentWorkspaceToVercelProject: (vercelProjectId: string) => void;
  unlinkCurrentWorkspaceFromVercelProject: () => void;
  redeployVercelDeployment: (deployment: VercelDeploymentSummary) => Promise<void>;
};

export type UseForgeIntegrationArgs = {
  githubToken: string;
  gitlabToken: string;
  gitlabHost: string;
  updateGithubToken: (token: string) => void;
  updateGitlabToken: (token: string) => void;
  updateVercelToken: (token: string) => void;
  updateGithubAccountLabel: (label: string | null) => void;
  updateGitlabAccountLabel: (label: string | null) => void;
  updateVercelAccountLabel: (label: string | null) => void;
  statusBar: StatusBarContextValue;
  captureError: (error: unknown) => void;
  setActiveChangesPanelTab: Dispatch<SetStateAction<"git" | "files" | "forge" | "vercel">>;
  setIsCreatePullRequestDialogOpen: Dispatch<SetStateAction<boolean>>;
};

export type UseForgeIntegrationResult = {
  forgeOverview: ForgeOverview | null;
  forgeBranchPullRequestStatus: ForgeBranchPullRequestStatus | null;
  isLoadingForgeOverview: boolean;
  forgeWorkItemDetail: ForgeWorkItemDetail | null;
  isLoadingForgeWorkItemDetail: boolean;
  forgeWorkItemDetailErrorMessage: string | null;
  isPerformingForgeWorkItemAction: boolean;
  isPostingForgeWorkItemComment: boolean;
  connectForgeAccount: (provider: "github" | "gitlab" | "vercel") => Promise<void>;
  refreshForgeOverview: () => void;
  loadForgeWorkItemDetail: (
    kind: ForgeWorkItemKind,
    number: number,
    repoOverride?: { host: string; fullName: string } | null
  ) => Promise<void>;
  performForgeWorkItemAction: (action: ForgeWorkItemAction) => Promise<void>;
  addForgeWorkItemComment: (payload: ForgeAddCommentPayload) => Promise<void>;
  handleCreateForgePullRequest: (payload: { title: string; body: string; baseBranch: string }) => Promise<void>;
  setForgeWorkItemDetail: Dispatch<SetStateAction<ForgeWorkItemDetail | null>>;
  setForgeWorkItemDetailErrorMessage: Dispatch<SetStateAction<string | null>>;
};

export type UseWorkspaceContentControllerArgs = {
  workspaceTasks: WorkspaceTasksState;
  workspaceSpecs: WorkspaceSpecsState;
  workspaceNotes: WorkspaceNotesState;
  workspaceTaskBoards: Record<string, { board: WorkspaceTaskBoard; isLoading: boolean; errorMessage: string | null }>;
  updateWorkspaceTaskBoard: (projectId: string, updater: (currentBoard: WorkspaceTaskBoard) => WorkspaceTaskBoard) => Promise<WorkspaceTaskBoard>;
  setWorkspaceTasks: Dispatch<SetStateAction<WorkspaceTasksState>>;
  setWorkspaceSpecs: Dispatch<SetStateAction<WorkspaceSpecsState>>;
  setWorkspaceNotes: Dispatch<SetStateAction<WorkspaceNotesState>>;
  reloadWorkspaceTasksForProject: (projectId: string) => Promise<void>;
  reloadWorkspaceSpecsForProject: (projectId: string) => Promise<void>;
  reloadWorkspaceNotesForProject: (projectId: string) => Promise<void>;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  fileEditorState: FileEditorState | null;
  openFileEditor: (pathName: string, options?: { selectChange?: boolean; rootPath?: string | null }) => Promise<void>;
  safelyAndRefresh: (action: () => Promise<AppState>, statusMessage?: string) => Promise<AppState | null>;
  updateSnapshotState: (next: AppState) => void;
  captureError: (error: unknown) => void;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  runWithStatus: (message: string, action: () => Promise<AppState>) => Promise<AppState | null>;
  statusBar: StatusBarContextValue;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  trackAgentCreation: (payload: CreateAgentPayload, source: "task-panel" | "task-reference" | "task-planner" | "dialog") => void;
};

export type UseWorkspaceContentControllerResult = {
  taskEditorState: TaskEditorState | null;
  setTaskEditorState: Dispatch<SetStateAction<TaskEditorState | null>>;
  isCreatingSpec: boolean;
  isCreatingNote: boolean;
  isTaskBoardOpen: boolean;
  setIsTaskBoardOpen: Dispatch<SetStateAction<boolean>>;
  isSpecBrowserOpen: boolean;
  setIsSpecBrowserOpen: Dispatch<SetStateAction<boolean>>;
  isNoteBrowserOpen: boolean;
  setIsNoteBrowserOpen: Dispatch<SetStateAction<boolean>>;
  generateTasksRequest: { projectId: string; specPath: string; nonce: number } | null;
  setGenerateTasksRequest: Dispatch<SetStateAction<{ projectId: string; specPath: string; nonce: number } | null>>;
  openTaskEditor: (projectId: string, pathName: string) => Promise<void>;
  createWorkspaceTask: (
    projectId?: string,
    options?: {
      contextText?: string;
    }
  ) => Promise<void>;
  openWorkspaceSpec: (projectId: string, pathName: string) => Promise<void>;
  createWorkspaceSpec: (
    projectId?: string,
    options?: {
      contextText?: string;
    }
  ) => Promise<void>;
  openWorkspaceNote: (projectId: string, pathName: string) => Promise<void>;
  createWorkspaceNote: (projectId?: string) => Promise<void>;
  duplicateTaskToNew: () => Promise<void>;
  saveTaskEditor: () => Promise<void>;
  handleToggleTaskComplete: (projectId: string, fromPath: string, toPath: string) => Promise<void>;
  handleDeleteTask: (projectId: string, pathName: string) => Promise<void>;
  handleDeleteSpec: (projectId: string, pathName: string) => Promise<void>;
  handleDeleteNote: (projectId: string, pathName: string) => Promise<void>;
  handleSpawnTaskAgent: (toolId: string) => Promise<void>;
  handleSpawnAgentsForTasks: (toolId: string, tasks: TaskCenterTaskReference[]) => Promise<void>;
  generateWorkspaceTasksWithAgent: (projectId: string, toolId: string, brief: string | null, specPath: string | null) => Promise<void>;
  handleCreateAgentFromDialog: (payload: CreateAgentPayload, taskPath: string | null) => Promise<void>;
};
