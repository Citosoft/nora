import type {
  AiChatMessage,
  AiChatReasoningLevel,
  AiChatTabState,
  BrowserTabState,
  CreateAgentDialogDefaults,
  CreateTerminalDialogDefaults,
  FileEditorState,
  FileEditorTab,
  ForgeViewerTabState,
  ResolvedTheme,
  TaskBoardViewMode,
  TerminalFontId,
  TerminalSubmission,
  TerminalThemeId,
  WindowUiState,
  WorkspaceNotesState,
  WorkspaceSpecsState,
  WorkspaceTaskBoardsState,
  WorkspaceTasksState
} from "@/components/app/types";
import type { FileEditorAgentSendTarget } from "@/components/app/types/fileEditor.types";
import type { TaskCenterTaskReference, WorkspaceSessionTab } from "@/components/app/types/workflow.types";
import type {
  AgentCatalogEntry,
  AgentContextPreview,
  AgentSession,
  AiModelCatalogEntry,
  AiProvider,
  AiSettings,
  AppSettings,
  AppState,
  ChangeEntry,
  CreateTerminalPayload,
  ForgeAddCommentPayload,
  ForgeOverview,
  ForgeWorkItemAction,
  ForgeWorkItemDetail,
  ForgeWorkItemKind,
  ForgeWorkItemSummary,
  LocalTerminalState,
  TerminalSession,
  TerminalShellOption,
  VercelDeploymentSummary,
  VercelProjectSummary,
  WorkspaceNoteSummary,
  WorkspaceScriptLauncher,
  WorkspaceSearchResult,
  WorkspaceSpecSummary,
  WorkspaceSplitView,
  WorkspaceSplitViewCollection,
  WorkspaceSplitViewItemReference,
  WorkspaceSummary,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary
} from "@shared/appTypes";
import type { ReactNode } from "react";

export type AgentContextCardProps = {
  preview: AgentContextPreview | null;
  loading: boolean;
  clearing: boolean;
  onClear: () => void;
  onClose: () => void;
};

export type AgentShortcutBarProps = {
  tools: AgentCatalogEntry[];
  disabled?: boolean;
  onCreateAgent: (toolId: string) => void;
  extraContent?: ReactNode;
};

export type FileEditorPanelProps = {
  tabs: FileEditorTab[];
  activePath: string;
  showTabStrip?: boolean;
  title?: string;
  resolvedTheme: ResolvedTheme;
  onGenerateTasks?: (() => void) | null;
  agentSendTargets?: FileEditorAgentSendTarget[];
  /** Clears file/diff as the active center tab so the session strip shows the focused agent (call before focusAgent). */
  onExitFileEditorForAgentHandoff?: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onRevert: () => void;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onClose: () => void;
};

export type FileTreePanelProps = {
  files: string[];
  directoryPaths: string[];
  changesByPath: Record<string, Pick<ChangeEntry, "additions" | "deletions">>;
  activePath: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  searchQuery: string;
  searchResults: WorkspaceSearchResult[];
  isSearching: boolean;
  isCaseSensitiveSearch: boolean;
  onSearchQueryChange: (query: string) => void;
  onCaseSensitiveSearchChange: (next: boolean) => void;
  onOpenFile: (pathName: string) => void;
  onImportImageToDirectory: (
    directoryPath: string,
    payload: { sourceUrl?: string; data?: Uint8Array; mimeType?: string; suggestedFileName?: string }
  ) => Promise<void>;
  onCreateFile: (pathName: string) => Promise<void>;
  onCreateDirectory: (pathName: string) => Promise<void>;
  onRenameFile: (fromPath: string, toPath: string) => Promise<void>;
  onDeleteFile: (pathName: string) => Promise<void>;
};

export type FileTreeNode = {
  name: string;
  path: string;
  kind: "file" | "directory";
  children: FileTreeNode[];
};

export type FocusedAgentPanelProps = {
  agent: AgentSession | null;
  terminal: TerminalSession | null;
  compact?: boolean;
};

export type ForgePanelProps = {
  overview: ForgeOverview | null;
  isLoading: boolean;
  resolvedTheme: ResolvedTheme;
  detail: ForgeWorkItemDetail | null;
  detailLoading: boolean;
  detailErrorMessage: string | null;
  actionLoading: boolean;
  commentLoading: boolean;
  tools: AgentCatalogEntry[];
  onRefresh: () => void;
  onOpenUrl: (url: string) => void;
  onOpenInViewer?: (() => void) | null;
  onOpenItem: (kind: ForgeWorkItemKind, item: ForgeWorkItemSummary) => void;
  onBackToList: () => void;
  onRefreshDetail: () => void;
  onAction: (action: ForgeWorkItemAction) => void;
  onCommentSubmit: (payload: ForgeAddCommentPayload) => Promise<void>;
  onSpawnIssueAgent: (toolId: string) => Promise<void>;
};

export type ForgeDetailPanelProps = Pick<
  ForgePanelProps,
  | "detail"
  | "detailLoading"
  | "detailErrorMessage"
  | "actionLoading"
  | "commentLoading"
  | "resolvedTheme"
  | "tools"
  | "onOpenUrl"
  | "onOpenInViewer"
  | "onBackToList"
  | "onRefreshDetail"
  | "onAction"
  | "onCommentSubmit"
  | "onSpawnIssueAgent"
> & {
  repoFullName?: string | null;
  repoProvider?: "github" | "gitlab";
};

export type LocalTerminalDockProps = {
  terminal: LocalTerminalState | null;
  resolvedTheme: ResolvedTheme;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  height: number;
  isCollapsed: boolean;
  isCreating: boolean;
  focusVersion: number;
  onHeightChange: (height: number) => void;
  onToggleCollapsed: () => void;
};

export type SessionTerminalProps = {
  sessionId: string;
  resetVersion: number;
  focusVersion?: number;
  submission: TerminalSubmission | null;
  canSendInput: boolean;
  resolvedTheme: ResolvedTheme;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
};

export type SpecBrowserWorkspaceEntry = {
  projectId: string;
  projectName: string;
  projectRootPath: string;
  specs: WorkspaceSpecSummary[];
  isLoading: boolean;
  errorMessage: string | null;
};

export type SpecBrowserPanelProps = {
  workspaces: SpecBrowserWorkspaceEntry[];
  isCreatingSpec: boolean;
  onOpenSpec: (projectId: string, path: string) => void;
  onCreateSpec: (projectId: string) => void;
  onDeleteSpec: (projectId: string, path: string) => Promise<void>;
  onGenerateTasksFromSpec: (projectId: string, path: string) => void;
  onClose: () => void;
};

export type NoteBrowserWorkspaceEntry = {
  projectId: string;
  projectName: string;
  projectRootPath: string;
  notes: WorkspaceNoteSummary[];
  isLoading: boolean;
  errorMessage: string | null;
};

export type NoteBrowserPanelProps = {
  workspaces: NoteBrowserWorkspaceEntry[];
  isCreatingNote: boolean;
  onOpenNote: (projectId: string, path: string) => void;
  onCreateNote: (projectId: string) => void;
  onDeleteNote: (projectId: string, path: string) => Promise<void>;
  onClose: () => void;
};

export type TaskBoardWorkspaceEntry = {
  projectId: string;
  projectName: string;
  projectRootPath: string;
  tasks: WorkspaceTaskSummary[];
  specs: WorkspaceSpecSummary[];
  board: WorkspaceTaskBoard;
  isTasksLoading: boolean;
  tasksErrorMessage: string | null;
  isBoardLoading: boolean;
  boardErrorMessage: string | null;
};

export type TaskBoardPanelProps = {
  workspaces: TaskBoardWorkspaceEntry[];
  availableTools: AgentCatalogEntry[];
  activeWorkspaceId: string | null;
  viewMode: TaskBoardViewMode;
  selectedTaskKeys: string[];
  selectedToolId: string;
  isSpawningAgents: boolean;
  onViewModeChange: (nextMode: TaskBoardViewMode) => void;
  onSelectWorkspace: (projectId: string) => void;
  onToggleTaskSelection: (projectId: string, taskPath: string) => void;
  onClearTaskSelection: () => void;
  onSelectedToolChange: (toolId: string) => void;
  onSpawnSelectedAgents: () => Promise<void>;
  onOpenTask: (projectId: string, taskPath: string) => void;
  onCreateTask: (projectId: string) => void;
  onGenerateTasks: (projectId: string, toolId: string, brief: string | null, specPath: string | null) => Promise<void>;
  onToggleTaskComplete: (projectId: string, fromPath: string, toPath: string) => Promise<void>;
  onDeleteTask: (projectId: string, taskPath: string) => Promise<void>;
  onMoveTask: (projectId: string, taskPath: string, sectionId: string) => Promise<void>;
  onCreateSection: (projectId: string, title: string) => Promise<void>;
  onRenameSection: (projectId: string, sectionId: string, title: string) => Promise<void>;
  onDeleteSection: (projectId: string, sectionId: string) => Promise<void>;
  generateTasksRequest: { projectId: string; specPath: string; nonce: number } | null;
  onClose: () => void;
};

export type DraggedTask = {
  projectId: string;
  taskPath: string;
} | null;

export type TaskPanelProps = {
  projectName: string;
  title: string;
  path: string;
  completed: boolean;
  updatedAt: string | null;
  boardSectionTitle: string | null;
  assignedAgents: Array<{
    agentId: string;
    agentName: string;
    toolLabel: string;
    assignedAt: string;
    isActive: boolean;
  }>;
  content: string;
  savedContent: string;
  isCreating: boolean;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  resolvedTheme: ResolvedTheme;
  tools: AgentCatalogEntry[];
  onChange: (value: string) => void;
  onSave: () => void;
  onRevert: () => void;
  onClose: () => void;
  onSpawnAgent: (toolId: string) => void;
  onDuplicateToNew: () => void;
};

export type TaskPanelMarkdownComponentProps = {
  children?: ReactNode;
};

export type TaskPanelLinkProps = {
  children?: ReactNode;
  href?: string;
};

export type TaskPanelCodeProps = {
  children?: ReactNode;
  className?: string;
};

export type TaskPanelCheckboxProps = {
  checked?: boolean;
  disabled?: boolean;
  type?: string;
};

export type VercelPanelProps = {
  isConnected: boolean;
  accountLabel: string | null;
  projects: VercelProjectSummary[];
  deployments: VercelDeploymentSummary[];
  linkedProject: VercelProjectSummary | null;
  suggestedProject: VercelProjectSummary | null;
  isLoadingProjects: boolean;
  isLoadingDeployments: boolean;
  redeployingDeploymentId: string | null;
  projectsErrorMessage: string | null;
  deploymentsErrorMessage: string | null;
  onRefreshProjects: () => void;
  onRefreshDeployments: () => void;
  onRedeployDeployment: (deployment: VercelDeploymentSummary) => void;
  onOpenUrl: (url: string) => void;
  onOpenSettings: () => void;
  onLinkProject: (projectId: string) => void;
  onUnlinkProject: () => void;
};

export type WorkspaceSessionPanelProps = {
  project: AppState["project"];
  workspace: WorkspaceSummary | null;
  agent: AgentSession | null;
  terminal: TerminalSession | null;
  browserTab: BrowserTabState | null;
  browserTabs: BrowserTabState[];
  aiChatTab: AiChatTabState | null;
  aiChatTabs: AiChatTabState[];
  aiSettings: AiSettings;
  aiModelOptions: Record<AiProvider, AiModelCatalogEntry[]>;
  aiModelLoading: Record<AiProvider, boolean>;
  onSelectAiChatProviderModel: (provider: AiProvider, model: string) => void;
  onOpenAiSettings: () => void;
  onUpdateAiChatTabTitle: (tabId: string, title: string) => void;
  forgeViewerTab: ForgeViewerTabState | null;
  forgeViewerTabs: ForgeViewerTabState[];
  fileEditorState: FileEditorState | null;
  isDiffExpanded: boolean;
  selectedDiffChange: ChangeEntry | null;
  splitViewCollection: WorkspaceSplitViewCollection;
  splitViews: WorkspaceSplitView[];
  splitViewsLoading: boolean;
  splitViewsErrorMessage: string | null;
  forgeOverview: ForgeOverview | null;
  forgeDetail: ForgeWorkItemDetail | null;
  forgeDetailLoading: boolean;
  forgeDetailErrorMessage: string | null;
  forgeActionLoading: boolean;
  forgeCommentLoading: boolean;
  tools: AgentCatalogEntry[];
  projectScripts: WorkspaceScriptLauncher[];
  terminalShells: TerminalShellOption[];
  terminalQuickLaunchDefaults: AppSettings["terminalQuickLaunchDefaults"];
  platform: WindowUiState["platform"];
  resolvedTheme: ResolvedTheme;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  showSessionTabs: boolean;
  activeView: WorkspaceSplitView | null;
  activeWorkspaceContentTab: "file" | "diff" | null;
  activeGridColumns: WorkspaceSplitView["gridColumns"];
  activeGridRows: WorkspaceSplitView["gridRows"];
  addFocusedLabel: string;
  canAddCurrentItem: boolean;
  onChooseProject: () => Promise<AppState | null>;
  onRefreshCatalog: () => Promise<AppState | null>;
  onCreateInWorkspace: (defaults: CreateAgentDialogDefaults) => void;
  onLaunchTerminalFromDefaults: (payload: CreateTerminalPayload) => void;
  onOpenCreateTerminal: (defaults: CreateTerminalDialogDefaults) => void;
  onOpenWorkspaceTerminalPresets: (projectId: string) => void;
  onOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  onOpenWorkspaceSwitcher: () => void;
  onOpenTaskBoard: () => void;
  onOpenSpecBrowser: () => void;
  onOpenNoteBrowser: () => void;
  onGenerateTasksFromSpec: (projectId: string, path: string) => void;
  onCreateWorkspaceTaskFromSelection: (projectId: string, selectionText: string) => Promise<void>;
  onCreateWorkspaceSpecFromSelection: (projectId: string, selectionText: string) => Promise<void>;
  onFocusView: (viewId: string | null) => void;
  onFocusBrowserTab: (tabId: string) => void;
  onCloseBrowserTab: (tabId: string) => void;
  onUpdateBrowserTab: (tabId: string, updater: (current: BrowserTabState) => BrowserTabState) => void;
  onOpenAiChat: (projectId: string) => void;
  onFocusAiChatTab: (tabId: string) => void;
  onCloseAiChatTab: (tabId: string) => void;
  onUpdateAiChatTabMessages: (tabId: string, updater: (current: AiChatMessage[]) => AiChatMessage[]) => void;
  onUpdateAiChatTabReasoningMode: (tabId: string, mode: AiChatReasoningLevel) => void;
  onFocusForgeViewerTab: (tabId: string) => void;
  onCloseForgeViewerTab: (tabId: string) => void;
  onFocusFileEditorTab: (path: string) => void;
  onCloseFileEditorTab: (path: string) => void;
  onSetActiveWorkspaceContentTab: (next: "file" | "diff" | null) => void;
  onChangeActiveFileEditorContent: (value: string) => void;
  onSaveActiveFileEditor: () => void;
  onRevertActiveFileEditor: () => void;
  onCloseExpandedDiff: () => void;
  onRestart: (agentId: string) => Promise<AppState | null>;
  onRestartTerminal: (sessionId: string) => Promise<AppState | null>;
  onClearTerminal: (sessionId: string) => Promise<AppState | null>;
  onDestroyRequest: (agentId: string) => void;
  onDestroyTerminal: (sessionId: string) => Promise<AppState | null>;
  onDeleteViewById: (viewId: string) => Promise<void>;
  onExitSplitView: () => void;
  onFocusAgent: (agentId: string) => void;
  onFocusTerminal: (terminalId: string) => void;
  onGridPresetChange: (gridColumns: WorkspaceSplitView["gridColumns"], gridRows: WorkspaceSplitView["gridRows"]) => void;
  onAddFocused: () => void;
  onRenameActiveView: (name: string) => void;
  onDeleteActiveView: () => void;
  onRefreshForge: () => void;
  onOpenForgeUrl: (url: string) => void;
  onOpenForgeItem: (kind: ForgeWorkItemKind, item: ForgeWorkItemSummary) => void;
  onRefreshForgeItem: () => void;
  onForgeAction: (action: ForgeWorkItemAction) => void;
  onForgeCommentSubmit: (payload: ForgeAddCommentPayload) => Promise<void>;
  onSpawnIssueAgent: (toolId: string) => Promise<void>;
  onAddItemToSlot: (item: WorkspaceSplitViewItemReference, column: number, row: number) => void;
  onMoveTile: (tileId: string, deltaColumn: number, deltaRow: number) => void;
  onMoveTileToPosition: (tileId: string, column: number, row: number) => void;
  onSwapTiles: (sourceTileId: string, targetTileId: string) => void;
  onRemoveTile: (tileId: string) => void;
};

export type WorkspaceSessionTabsProps = {
  tabs: WorkspaceSessionTab[];
  activeTabId: string | null;
  tools: AgentCatalogEntry[];
  onSelect: (tab: WorkspaceSessionTab) => void;
  onClose: (tab: WorkspaceSessionTab) => void;
  onCreateAgent: (toolId: string) => void;
  onCreateTerminalFromDefaults: () => void;
  onCreateTerminal: () => void;
  onCreateBrowser: () => void;
  onCreateAiChat: () => void;
};

export type WorkspaceSessionToolbarProps = {
  splitViewCollection: WorkspaceSplitViewCollection;
  splitViewsLoading: boolean;
  splitViewsErrorMessage: string | null;
  activeViewId: string | null;
  activeGridColumns: WorkspaceSplitView["gridColumns"];
  activeGridRows: WorkspaceSplitView["gridRows"];
  addFocusedLabel: string;
  canAddCurrentItem: boolean;
  onGridPresetChange: (gridColumns: WorkspaceSplitView["gridColumns"], gridRows: WorkspaceSplitView["gridRows"]) => void;
  onAddFocused: () => void;
  onRenameView: (name: string) => void;
  onDeleteView: () => void;
};

export type WorkspaceSplitViewPanelProps = {
  view: WorkspaceSplitView;
};

export type SpecCenterProps = {
  workspaceSpecs: WorkspaceSpecsState;
  isCreatingSpec: boolean;
  onOpenSpec: (projectId: string, path: string) => void;
  onCreateSpec: (projectId: string) => void;
  onDeleteSpec: (projectId: string, path: string) => Promise<void>;
  onGenerateTasksFromSpec: (projectId: string, path: string) => void;
  onClose: () => void;
};

export type NoteCenterProps = {
  workspaceNotes: WorkspaceNotesState;
  isCreatingNote: boolean;
  onOpenNote: (projectId: string, path: string) => void;
  onCreateNote: (projectId: string) => void;
  onDeleteNote: (projectId: string, path: string) => Promise<void>;
  onClose: () => void;
};

export type TaskCenterProps = {
  workspaceTasks: WorkspaceTasksState;
  workspaceSpecs: WorkspaceSpecsState;
  workspaceTaskBoards: WorkspaceTaskBoardsState;
  updateWorkspaceTaskBoard: (projectId: string, updater: (currentBoard: WorkspaceTaskBoard) => WorkspaceTaskBoard) => Promise<WorkspaceTaskBoard>;
  tools: AgentCatalogEntry[];
  onOpenTask: (projectId: string, path: string) => void;
  onCreateTask: (projectId: string) => void;
  onGenerateTasks: (projectId: string, toolId: string, brief: string | null, specPath: string | null) => Promise<void>;
  onToggleTaskComplete: (projectId: string, fromPath: string, toPath: string) => Promise<void>;
  onDeleteTask: (projectId: string, path: string) => Promise<void>;
  onSpawnAgentsForTasks: (toolId: string, tasks: TaskCenterTaskReference[]) => Promise<void>;
  generateTasksRequest: { projectId: string; specPath: string; nonce: number } | null;
  onClose: () => void;
};
