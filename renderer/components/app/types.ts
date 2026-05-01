import type {
  AgentSession,
  AppState,
  CreateAgentPayload,
  CreateTerminalPayload,
  ForgeWorkItemKind,
  WorkspaceNoteSummary,
  WorkspaceSpecSummary,
  WorkspaceSplitViewCollection,
  WorkspaceTaskBoard,
  WorkspaceTaskSummary
} from "@shared/appTypes";

export type WindowUiState = {
  isMaximized: boolean;
  platform: NodeJS.Platform;
};

export type ToolPopoverState = {
  toolId: string;
  top: number;
  left: number;
};

export type ThemeMode = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

export type AccentColor =
  | "silver"
  | "green"
  | "blue"
  | "amber"
  | "rose"
  | "violet";

export type TerminalThemeId =
  | "app"
  | "vscode-dark"
  | "dracula"
  | "solarized-dark"
  | "solarized-light";

export type TerminalFontId =
  | "ibm-plex-mono"
  | "jetbrains-mono"
  | "fira-code"
  | "cascadia-mono"
  | "source-code-pro"
  | "space-mono";

export type StatusBarEntry = {
  id: number;
  message: string;
  loading: boolean;
};

export type TerminalSubmission = {
  nonce: number;
  value: string;
};

export type FileEditorTab = {
  projectId: string;
  path: string;
  rootPath: string | null;
  kind: "text" | "image";
  content: string;
  savedContent: string;
  imageDataUrl: string | null;
  imageMimeType: string | null;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  /** When true, content is not persisted via workspace write (e.g. Nora metadata preview). */
  isReadOnly?: boolean;
};

export type FileEditorState = {
  activePath: string;
  tabs: FileEditorTab[];
};

export type CreateAgentDialogDefaults = {
  toolId?: string;
  mode?: AgentSession["mode"];
  target?: CreateAgentPayload["target"];
  contextSelections?: NonNullable<CreateAgentPayload["contextSelections"]>;
  /** Wizard step to show when the dialog opens: 0 Agent, 1 Workspace, 2 Context. */
  initialWizardStepIndex?: number;
};

export type CreateTerminalDialogDefaults = {
  name?: string;
  shellId?: string;
  target?: CreateTerminalPayload["target"];
  launchConfig: CreateTerminalPayload["launchConfig"];
};

export type BrowserTabStatus = "starting" | "running" | "error";

export type BrowserTabState = {
  id: string;
  projectId: string;
  title: string;
  faviconUrl: string | null;
  history: string[];
  historyIndex: number;
  status: BrowserTabStatus;
};

export type ForgeViewerTabState = {
  id: string;
  projectId: string;
  kind: ForgeWorkItemKind | "workflow_run";
  number: number;
  title: string;
  forgeRepoHostOverride: string | null;
  forgeRepoFullNameOverride: string | null;
};

/**
 * Workspace AI chat reasoning depth. Mapped per provider in `workspaceChatProviderOptions`.
 * Legacy persisted values `standard` → off, `thinking` → medium.
 */
export type AiChatReasoningLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

export const AI_CHAT_REASONING_LEVELS: readonly AiChatReasoningLevel[] = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh"
] as const;

export function isAiChatReasoningLevel(value: string): value is AiChatReasoningLevel {
  return (AI_CHAT_REASONING_LEVELS as readonly string[]).includes(value);
}

export type AiChatMode = "ask" | "agent" | "plan";

export const AI_CHAT_MODES: readonly AiChatMode[] = ["ask", "agent", "plan"] as const;

export type AiChatTabState = {
  id: string;
  projectId: string;
  title: string;
  messages: AiChatMessage[];
  /** Reasoning / thinking depth for this tab (see `AiChatReasoningLevel`). */
  reasoningMode: AiChatReasoningLevel;
};

export type AiChatMessage = import("ai").UIMessage<unknown, never, import("ai").InferUITools<{}>>;

export type StoredBrowserTabsState = {
  tabs: BrowserTabState[];
  focusedTabId: string | null;
};

export type StoredAiChatTabsState = {
  tabs: AiChatTabState[];
  focusedTabId: string | null;
};

export type StoredForgeViewerTabsState = {
  tabs: ForgeViewerTabState[];
  focusedTabId: string | null;
};

export type StoredFileEditorTabState = {
  projectId: string;
  path: string;
  rootPath: string | null;
};

export type StoredFileEditorState = {
  tabs: StoredFileEditorTabState[];
  activePath: string | null;
};

export type StoredWorkspaceContentState = {
  activeWorkspaceContentTab: "file" | "diff" | null;
  fileEditor: StoredFileEditorState | null;
};

export type StoredUiLayout = {
  isWorkspaceSidebarCollapsed: boolean;
  isChangesSidebarCollapsed: boolean;
  workspaceSidebarWidth: number;
  changesSidebarWidth: number;
  activeChangesPanelTab: "git" | "files" | "context" | "forge" | "vercel";
  collapsedWorkspaceIds: Record<string, boolean>;
  isTasksSectionCollapsed: boolean;
  isRemoteMountsSectionCollapsed: boolean;
  isPortsSectionCollapsed: boolean;
  isChatbotsSectionCollapsed: boolean;
  isCliSectionCollapsed: boolean;
  isSkillsSectionCollapsed: boolean;
  isSpecsSectionCollapsed: boolean;
  isLocalTerminalDockCollapsed: boolean;
  localTerminalDockHeight: number;
};

export type UiState = {
  snapshot: AppState | null;
  activeErrorMessage: string | null;
  showAddWorkspaceModal: boolean;
  showRemoteWorkspaceModal: boolean;
  showCreateAgentModal: boolean;
  createAgentDefaults: CreateAgentDialogDefaults | null;
  showCreateTerminalModal: boolean;
  createTerminalDefaults: CreateTerminalDialogDefaults | null;
  showAboutDialog: boolean;
  showKeyboardShortcutsDialog: boolean;
  showWorkspaceSwitcherDialog: boolean;
  destroyAgentId: string | null;
  removeMissingWorkspaceRoot: string | null;
  removeMissingWorkspaceError: string | null;
  showResetWorkspacesDialog: boolean;
  workspaceTerminalPresetsProjectId: string | null;
  browserTabs: BrowserTabState[];
  focusedBrowserTabId: string | null;
  forgeViewerTabs: ForgeViewerTabState[];
  focusedForgeViewerTabId: string | null;
  aiChatTabs: AiChatTabState[];
  focusedAiChatTabId: string | null;
  installCommandDrafts: Record<string, string>;
};

export type WorkspaceLoadingState = {
  token: number;
  projectId: string;
  projectName: string;
  targetLabel: string;
  detail: string;
  command: string | null;
  kind: "local" | "ssh";
};

export type AppView = "main" | "settings";

export type WorkspaceFileTreeState = {
  rootPath: string | null;
  paths: string[];
  directoryPaths: string[];
  isLoading: boolean;
  errorMessage: string | null;
};

export type WorkspaceTasksState = Record<string, {
  tasks: WorkspaceTaskSummary[];
  isLoading: boolean;
  errorMessage: string | null;
}>;

export type WorkspaceSpecsState = Record<string, {
  specs: WorkspaceSpecSummary[];
  isLoading: boolean;
  errorMessage: string | null;
}>;

export type WorkspaceNotesState = Record<string, {
  notes: WorkspaceNoteSummary[];
  isLoading: boolean;
  errorMessage: string | null;
}>;

export type WorkspaceTaskBoardsState = Record<string, {
  board: WorkspaceTaskBoard;
  isLoading: boolean;
  errorMessage: string | null;
}>;

export type WorkspaceSplitViewsState = Record<string, {
  collection: WorkspaceSplitViewCollection;
  isLoading: boolean;
  errorMessage: string | null;
}>;

export type TaskEditorState = {
  projectId: string;
  projectName: string;
  projectRootPath: string;
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
};

export type TaskBoardViewMode = "list" | "board";

export type StoredVercelWorkspaceLink = {
  vercelProjectId: string;
  teamId: string | null;
};

export type StoredVercelWorkspaceLinks = Record<string, StoredVercelWorkspaceLink>;

export type StoredWorkspaceSplitViewSelections = Record<string, string>;
