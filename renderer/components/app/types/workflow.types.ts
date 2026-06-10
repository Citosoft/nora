import type {
  AccentColor,
  AiChatTabState,
  BrowserTabState,
  CreateAgentDialogDefaults,
  CreateTerminalDialogDefaults,
  FileEditorTab,
  FileEditorState,
  ResolvedTheme,
  UiFontId,
  StoredVercelWorkspaceLinks,
  TerminalFontId,
  TerminalThemeId,
  ThemeMode,
  UiState,
  WindowUiState,
  WorkspaceLoadingState
} from "@/components/app/types";
import type {
  AgentSession,
  AgentSkillCatalog,
  AiProvider,
  AnalyticsRuntimeConfig,
  AppSettings,
  AppState,
  CreateTerminalPayload,
  ForgeOAuthProviderConfig,
  ForgeProvider,
  InstalledIde,
  LinuxAptSetupStatus,
  LinuxUpdateStatus,
  TerminalSession,
  WorkspaceNoteSummary,
  WorkspaceSpecSummary,
  WorkspaceSplitView,
  WorkspaceSplitViewCollection,
  WorkspaceSplitViewTile,
  WorkspaceSummary,
  WorkspaceTaskBoard,
  WorkspaceTaskBoardSection,
  WorkspaceTaskSummary
} from "@shared/appTypes";
import type { Dispatch, SetStateAction, SVGProps } from "react";

export type ForgeProviderIconProps = SVGProps<SVGSVGElement> & {
  provider: ForgeProvider;
};

export type UpdateSnapshot = (next: AppState) => void;

export type AgentRoleId = "developer" | "reviewer" | "planner" | "researcher" | "tester";

export type AgentRoleOption = {
  id: AgentRoleId;
  label: string;
  promptPrefix: string;
};

export type ShortcutKey =
  | "mod"
  | "shift"
  | "alt"
  | "b"
  | "k"
  | "t"
  | "a"
  | "j"
  | "o"
  | ","
  | "["
  | "]"
  | "/"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "w";

export type ShortcutDefinition = {
  id:
    | "toggle-workspace-sidebar"
    | "toggle-changes-sidebar"
    | "open-keyboard-shortcuts"
    | "open-workspace-switcher"
    | "open-workspace-quick-search"
    | "open-settings"
    | "open-startup-dependencies"
    | "open-create-terminal"
    | "open-add-workspace"
    | "open-workspace-browser"
    | "open-create-agent"
    | "toggle-local-terminal-dock"
    | "focus-local-terminal-dock"
    | "focus-next-session-tab"
    | "focus-previous-session-tab"
    | "close-active-session-tab"
    | "open-recent-workspace-1"
    | "open-recent-workspace-2"
    | "open-recent-workspace-3"
    | "open-recent-workspace-4"
    | "open-recent-workspace-5";
  title: string;
  description: string;
  category: "Workbench" | "Help";
  keys: ShortcutKey[];
  allowInEditable?: boolean;
  /** When set (help dialog only), overrides formatted `keys` for display. */
  helpKeysLabel?: string;
};

export type AgentSkillCatalogSummary = {
  toolId: string;
  kind: "shared" | "tool";
  label: string;
  catalog: AgentSkillCatalog;
};

export type StatusBarContextValue = {
  beginStatus: (message: string, loading?: boolean) => number;
  endStatus: (id: number) => void;
};

export type WorkspaceTaskSectionGroup = {
  section: WorkspaceTaskBoardSection;
  tasks: WorkspaceTaskSummary[];
};

export type TaskListEntry = WorkspaceTaskSummary & {
  projectId: string;
  projectName: string;
  projectRootPath: string;
};

export type SpecListEntry = WorkspaceSpecSummary & {
  projectId: string;
  projectName: string;
  projectRootPath: string;
};

export type NoteListEntry = WorkspaceNoteSummary & {
  projectId: string;
  projectName: string;
  projectRootPath: string;
};

export type WorkspaceTaskBoardUpdater = (
  projectId: string,
  updater: (currentBoard: WorkspaceTaskBoard) => WorkspaceTaskBoard
) => Promise<WorkspaceTaskBoard>;

export type TaskCenterGenerateRequest = {
  projectId: string;
  specPath: string;
  nonce: number;
} | null;

export type WorkspaceSidebarSectionToggle = Dispatch<SetStateAction<boolean>>;
export type WorkspaceCollapseMapUpdater = Dispatch<SetStateAction<Record<string, boolean>>>;
export type TaskEditorMode = "preview" | "edit";
export type FocusedAgentPanelCompact = boolean;
export type TaskPanelDuplicateAction = () => void;
export type TaskPanelSpawnAgentAction = (toolId: string) => void;
export type WorkspaceSidebarTaskAction = (projectId: string, path: string) => void;
export type WorkspaceSidebarSpecAction = (projectId: string, path: string) => void;
export type WorkspaceSidebarMutation = (projectId: string, path: string) => Promise<void>;
export type WorkspaceSidebarTaskToggle = (projectId: string, fromPath: string, toPath: string) => Promise<void>;
export type TaskCenterTaskMutation = (projectId: string, path: string) => Promise<void>;

export type SkillInstallTranscript = {
  command: string | null;
  lines: string[];
  success: boolean | null;
};

export type ProjectSelectorScreenProps = {
  installCommandDrafts: Record<string, string>;
  onChooseProject: () => void;
  onSelectRecent: (projectRoot: string) => void;
  onRefreshCatalog: () => void;
  onInstallDraftChange: (toolId: string, value: string) => void;
  onInstallTool: (toolId: string) => void;
  onRemoveTool: (toolId: string) => void;
};

export type WorkspaceSidebarProps = {
  githubToken: string;
  gitlabToken: string;
  gitlabHost: string;
  terminalPresets: AppSettings["terminalPresets"];
  terminalQuickLaunchDefaults: AppSettings["terminalQuickLaunchDefaults"];
  agentsNeedingAttention: Record<string, boolean>;
  focusedWorkspace: WorkspaceSummary | null;
  focusedAgent: AgentSession | null;
  focusedTerminal: TerminalSession | null;
  removingWorkspaceRoots: string[];
  collapsed: boolean;
  collapsedWorkspaceIds: Record<string, boolean>;
  isRemoteMountsSectionCollapsed: boolean;
  isPortsSectionCollapsed: boolean;
  isChatbotsSectionCollapsed: boolean;
  isCliSectionCollapsed: boolean;
  workspaceTasks: Array<WorkspaceTaskSummary & { projectId: string; projectName: string; projectRootPath: string }>;
  workspaceSpecs: Array<WorkspaceSpecSummary & { projectId: string; projectName: string; projectRootPath: string }>;
  workspaceNotes: Array<WorkspaceNoteSummary & { projectId: string; projectName: string; projectRootPath: string }>;
  aiChatTabs: AiChatTabState[];
  focusedAiChatTabId: string | null;
  focusedBrowserTabId: string | null;
  focusedForgeViewerTabId: string | null;
  activeWorkspaceContentTab: "file" | "diff" | null;
  isTaskBoardOpen: boolean;
  isSpecBrowserOpen: boolean;
  isNoteBrowserOpen: boolean;
  installCommandDrafts: Record<string, string>;
  onChooseProject: () => void;
  onCloseProject: () => void;
  onRemoveProject: (projectRoot: string) => void;
  onUnmountRemoteMount: (mountPoint: string) => Promise<AppState | null>;
  onChooseProjectAtPath: (defaultPath: string, title?: string) => Promise<void>;
  onRefresh: () => void;
  onRefreshCatalog: () => void;
  onResetWorkspaces: () => void;
  onOpenCreateAgent: (defaults?: CreateAgentDialogDefaults) => void;
  onOpenCreateTerminal: (defaults: CreateTerminalDialogDefaults) => void;
  onLaunchWorkspaceTerminal: (projectId: string, payload: CreateTerminalPayload) => void;
  onLaunchWorkspaceScript: (projectId: string, defaults: CreateTerminalDialogDefaults) => void;
  onOpenWorkspaceTerminalPresets: (projectId: string) => void;
  onOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  onFocusWorkspace: (projectId: string) => void;
  onFocusWorkspaceView: (worktreeId: string) => void;
  onFocusWorkspaceWorktree: (projectId: string, worktreeId: string) => Promise<AppState | null>;
  onOpenWorkflowRunChangeRequest: (projectId: string, worktreeId: string) => Promise<void>;
  onOpenCreateAgentOnWorktree: (projectId: string, worktreeId: string) => void;
  onOpenCreateTerminalOnWorktree: (projectId: string, worktreeId: string) => void;
  onOpenCreateWorktree: (projectId: string) => void;
  onLaunchQuickTerminalOnWorktree: (projectId: string, worktreeId: string) => void;
  onLaunchWorktreeScript: (projectId: string, payload: CreateTerminalPayload) => void;
  onRemoveWorktree: (projectId: string, worktreeId: string, branch: string) => void;
  onFocusAgent: (agentId: string) => void;
  onFocusTerminal: (sessionId: string) => void;
  onFocusWorkspaceAgent: (projectId: string, agentId: string) => Promise<AppState | null>;
  onFocusWorkspaceTerminal: (projectId: string, sessionId: string) => Promise<AppState | null>;
  onRestartAgent: (agentId: string) => Promise<AppState | null>;
  onDestroyAgentRequest: (agentId: string) => void;
  onRenameTerminal: (sessionId: string, nextName: string) => Promise<AppState | null>;
  onDestroyTerminal: (sessionId: string) => Promise<AppState | null>;
  onOpenTask: (projectId: string, path: string) => void;
  onCreateTask: (projectId: string) => void;
  onOpenSpec: (projectId: string, path: string) => void;
  onCreateSpec: (projectId: string) => void;
  onDeleteSpec: (projectId: string, path: string) => Promise<void>;
  onGenerateTasksFromSpec: (projectId: string, path: string) => void;
  onOpenNote: (projectId: string, path: string) => void;
  onCreateNote: (projectId: string) => void;
  onDeleteNote: (projectId: string, path: string) => Promise<void>;
  onOpenTaskBoard: () => void;
  onOpenSpecBrowser: () => void;
  onOpenNoteBrowser: () => void;
  onOpenAiChatFromSidebar: (projectId: string) => void;
  onFocusWorkspaceAiChatTab: (projectId: string, tabId: string) => void;
  isCreatingTask: boolean;
  isCreatingSpec: boolean;
  isCreatingNote: boolean;
  onToggleTaskComplete: (projectId: string, fromPath: string, toPath: string) => Promise<void>;
  onDeleteTask: (projectId: string, path: string) => Promise<void>;
  onInstallDraftChange: (toolId: string, value: string) => void;
  onInstallTool: (toolId: string) => void;
  onRemoveTool: (toolId: string) => void;
  onCollapsedWorkspaceIdsChange: Dispatch<SetStateAction<Record<string, boolean>>>;
  onRemoteMountsSectionCollapsedChange: Dispatch<SetStateAction<boolean>>;
  onPortsSectionCollapsedChange: Dispatch<SetStateAction<boolean>>;
  onChatbotsSectionCollapsedChange: Dispatch<SetStateAction<boolean>>;
  onCliSectionCollapsedChange: Dispatch<SetStateAction<boolean>>;
  onOpenCliSettings: () => void;
  onToggleCollapsed: () => void;
};

export type TaskCenterTaskReference = {
  projectId: string;
  projectName: string;
  projectRootPath: string;
  path: string;
  title: string;
};

export type UseAppBootstrapArgs = {
  setUiState: Dispatch<SetStateAction<UiState>>;
  initialWindowUiState: WindowUiState;
};

export type UseAppBootstrapResult = {
  windowUiState: WindowUiState;
  installedIdes: InstalledIde[];
  isLoadingInstalledIdes: boolean;
  forgeOAuthProviders: ForgeOAuthProviderConfig[];
  isLoadingForgeOAuthProviders: boolean;
};

export type AppPreferences = {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  uiFontId: UiFontId;
  defaultIdeId: string | null;
  forceMacTitleBarPreview: boolean;
  userDisplayName: string;
  githubToken: string;
  gitlabToken: string;
  gitlabHost: string;
  vercelToken: string;
  githubAccountLabel: string | null;
  gitlabAccountLabel: string | null;
  vercelAccountLabel: string | null;
  resolvedTheme: ResolvedTheme;
  vercelWorkspaceLinks: StoredVercelWorkspaceLinks;
  appSettings: AppSettings;
  isAppSettingsLoaded: boolean;
  toggleTheme: () => void;
  updateThemeMode: (nextMode: ThemeMode) => void;
  updateAccentColor: (nextAccentColor: AccentColor) => void;
  updateTerminalTheme: (nextThemeId: TerminalThemeId) => void;
  updateTerminalFont: (nextFontId: TerminalFontId) => void;
  updateUiFont: (nextUiFontId: UiFontId) => void;
  updateDefaultIde: (nextIdeId: string | null) => void;
  updateForceMacTitleBarPreview: (enabled: boolean) => void;
  updateUserDisplayName: (nextDisplayName: string) => void;
  updateGithubToken: (nextToken: string) => void;
  updateGitlabToken: (nextToken: string) => void;
  updateGitlabHost: (nextHost: string) => void;
  updateVercelToken: (nextToken: string) => void;
  updateVercelWorkspaceLinks: (nextLinks: StoredVercelWorkspaceLinks) => void;
  updateGithubAccountLabel: (nextLabel: string | null) => void;
  updateGitlabAccountLabel: (nextLabel: string | null) => void;
  updateVercelAccountLabel: (nextLabel: string | null) => void;
  updateFileEditorThemeId: (themeId: AppSettings["fileEditorThemeId"]) => Promise<void>;
  updateHardwareAccelerationEnabled: (enabled: boolean) => Promise<void>;
  updateWorkspaceStateStorageMode: (mode: AppSettings["workspaceStateStorageMode"]) => Promise<void>;
  updateDefaultAgentLaunchTarget: (launchTarget: AppSettings["defaultAgentLaunchTarget"]) => Promise<void>;
  updatePreferredAgentToolId: (toolId: AppSettings["preferredAgentToolId"]) => Promise<void>;
  updateLinuxAptSetupPromptDismissed: (dismissed: boolean) => Promise<void>;
  updateSplitViewPreferences: (
    nextSplitViewSettings: Pick<
      AppSettings,
      | "defaultSplitViewGridColumns"
      | "defaultSplitViewGridRows"
      | "rememberLastSplitViewPerWorkspace"
      | "confirmSplitViewDelete"
      | "showWorkspaceSessionTabs"
    >
  ) => Promise<void>;
  updateBrowserPreferences: (
    nextBrowserSettings: Partial<Pick<AppSettings, "openInternalBrowserOnNewPortDetection" | "browserDataImportPromptSeen">>
  ) => Promise<void>;
  updateNotificationPreferences: (nextNotificationSettings: Pick<AppSettings, "agentCompletionNotificationsEnabled">) => Promise<void>;
  updateAnalyticsConsentStatus: (status: AppSettings["analyticsConsentStatus"]) => Promise<void>;
  updateTerminalPresets: (presets: AppSettings["terminalPresets"]) => Promise<void>;
  updateTerminalQuickLaunchDefaults: (defaults: AppSettings["terminalQuickLaunchDefaults"]) => Promise<void>;
  updateAiPreferredProvider: (provider: AiProvider) => Promise<void>;
  updateAiApiKey: (provider: AiProvider, apiKey: string) => Promise<void>;
  updateAiModel: (provider: AiProvider, model: string) => Promise<void>;
  updateVoiceSettings: (voice: AppSettings["voice"]) => Promise<void>;
  updateAiSimpleTaskSettings: (
    settings: Pick<AppSettings["ai"], "simpleTaskProvider" | "localLlmModelId">
  ) => Promise<void>;
  relaunchApplication: () => Promise<void>;
};

export type UseFileEditorStateArgs = {
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  setUiState: Dispatch<SetStateAction<UiState>>;
  onOpenEditor: () => void;
  /** Called after a workspace file is saved successfully (e.g. refresh note/spec summaries in the sidebar). */
  onAfterWorkspaceFileSaved?: (payload: { projectId: string; path: string }) => void;
};

export type OpenWorkspaceFileEditorOptions = {
  selectChange?: boolean;
  rootPath?: string | null;
  /** When set, skips workspace read and opens the tab with this content immediately. */
  prefetchedContent?: string;
  /** When true with prefetched content, save and edit affordances are disabled. */
  isReadOnly?: boolean;
};

export type UseFileEditorStateResult = {
  fileEditorState: FileEditorState | null;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  openFileEditor: (pathName: string, options?: OpenWorkspaceFileEditorOptions) => Promise<void>;
  saveFileEditor: (pathName?: string) => Promise<void>;
};

export type ShortcutActionMap = Record<ShortcutDefinition["id"], () => void>;

export type UseLinuxAptSetupPromptArgs = {
  appSettings: AppSettings;
  updateLinuxAptSetupPromptDismissed: (dismissed: boolean) => Promise<void>;
  captureError: (error: unknown) => void;
};

export type UseAnalyticsConsentPromptArgs = {
  appSettings: AppSettings;
  isAppSettingsLoaded: boolean;
  isOnboardingOpen: boolean;
  updateAnalyticsConsentStatus: (status: AppSettings["analyticsConsentStatus"]) => Promise<void>;
  captureError: (error: unknown) => void;
};

export type UseAnalyticsConsentPromptResult = {
  analyticsRuntimeConfig: AnalyticsRuntimeConfig | null;
  isAnalyticsConsentDialogOpen: boolean;
  allowAnalyticsConsent: () => void;
  declineAnalyticsConsent: () => void;
};

export type UseLinuxAptSetupPromptResult = {
  linuxAptSetupStatus: Extract<LinuxAptSetupStatus, { kind: "missing" }> | null;
  isLinuxAptSetupDialogOpen: boolean;
  linuxAptSetupErrorMessage: string | null;
  isInstallingLinuxAptUpdates: boolean;
  closeLinuxAptSetupDialog: () => void;
  installLinuxAptUpdates: () => void;
};

export type UseLinuxUpdateNoticeResult = {
  linuxUpdateStatus: Extract<LinuxUpdateStatus, { kind: "available" }> | null;
  dismissLinuxUpdateNotice: () => void;
};

export type UseWorkspaceLoadingArgs = {
  setUiState: Dispatch<SetStateAction<UiState>>;
  captureError: (error: unknown) => void;
};

export type UseWorkspaceLoadingResult = {
  workspaceLoading: WorkspaceLoadingState | null;
  dismissWorkspaceLoading: () => void;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
};

export type UseWorkspaceSessionViewsArgs = {
  projectId: string | null;
  agent: AgentSession | null;
  terminal: TerminalSession | null;
  browserTab: BrowserTabState | null;
  activeFileEditorTab: FileEditorTab | null;
  activeWorkspaceContentTab: "file" | "diff" | null;
  defaultGridColumns: WorkspaceSplitView["gridColumns"];
  defaultGridRows: WorkspaceSplitView["gridRows"];
  rememberLastViewPerWorkspace: boolean;
  confirmDeleteView: boolean;
  splitViewCollection: WorkspaceSplitViewCollection;
  onSaveSplitViews: (projectId: string, collection: WorkspaceSplitViewCollection) => Promise<WorkspaceSplitViewCollection>;
  onError: (error: unknown) => void;
};

export type WorkspaceSessionTab =
  | {
      id: string;
      kind: "agent";
      name: string;
      toolId: string;
      toolLabel: string;
      status: AgentSession["status"];
      isBusy: AgentSession["isBusy"];
      busyUntil: AgentSession["busyUntil"];
    }
  | {
      id: string;
      kind: "terminal";
      name: string;
      status: TerminalSession["status"];
    }
  | {
      id: string;
      kind: "browser";
      name: string;
      status: BrowserTabState["status"];
      faviconUrl: string | null;
    }
  | {
      id: string;
      kind: "forge";
      name: string;
      status: "running";
    }
  | {
      id: string;
      kind: "ai-chat";
      name: string;
      status: "running" | "submitted" | "streaming" | "ready" | "error";
    }
  | {
      id: string;
      kind: "view";
      name: string;
      status: "idle";
    }
  | {
      id: string;
      kind: "file";
      path: string;
      name: string;
      status: "idle" | "starting";
    }
  | {
      id: string;
      kind: "diff";
      path: string;
      name: string;
      status: "idle";
    };

export type GridColumns = WorkspaceSplitView["gridColumns"];
export type GridRows = WorkspaceSplitView["gridRows"];
export type GridPosition = Pick<WorkspaceSplitViewTile, "column" | "row">;
