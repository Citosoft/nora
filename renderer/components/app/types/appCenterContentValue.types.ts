import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { WorkspaceSessionViewsApi } from "@/components/app/hooks/useWorkspaceSessionViews";
import type {
  ForgeReviewAgentTargetMode,
  ForgeReviewCommentSelection
} from "@/components/app/types/forgeReviewHandoff.types";
import type {
  AiChatMessage,
  AiChatReasoningLevel,
  AiChatTabState,
  BrowserTabState,
  FileEditorState,
  ForgeViewerTabState,
  ResolvedTheme,
  TaskEditorState,
  TerminalFontId,
  TerminalThemeId,
  UiState,
  WindowUiState,
  WorkspaceNotesState,
  WorkspaceSpecsState
} from "@/components/app/types";
import type { UseAiModelCatalogResult, UseWorkspaceContentControllerResult, UseWorkspaceResourcesResult } from "@/components/app/types/appHooks.types";
import type { AppMainCenterContentValue } from "@/components/app/types/appMainCenterContent.types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { TaskCenterTaskReference } from "@/components/app/types/workflow.types";
import type {
  AgentSession,
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
  TerminalSession,
  WorkspaceSplitViewCollection,
  WorkspaceSummary,
  WorkspaceTaskBoard
} from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type AppCenterContentValueArgs = {
  resolvedTheme: ResolvedTheme;
  taskEditorState: TaskEditorState | null;
  setTaskEditorState: Dispatch<SetStateAction<TaskEditorState | null>>;
  saveTaskEditor: () => void | Promise<void>;
  handleSpawnTaskAgent: (toolId: string) => Promise<void>;
  duplicateTaskToNew: () => Promise<void>;
  workspaceTasks: UseWorkspaceResourcesResult["workspaceTasks"];
  workspaceSpecs: WorkspaceSpecsState;
  workspaceNotes: WorkspaceNotesState;
  workspaceTaskBoards: Record<string, { board: WorkspaceTaskBoard; isLoading: boolean; errorMessage: string | null }>;
  updateWorkspaceTaskBoard: (
    projectId: string,
    updater: (currentBoard: WorkspaceTaskBoard) => WorkspaceTaskBoard
  ) => Promise<WorkspaceTaskBoard>;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  openTaskEditor: (projectId: string, pathName: string) => Promise<void>;
  createWorkspaceTask: UseWorkspaceContentControllerResult["createWorkspaceTask"];
  generateWorkspaceTasksWithAgent: (projectId: string, toolId: string, brief: string | null, specPath: string | null) => Promise<void>;
  handleToggleTaskComplete: UseWorkspaceContentControllerResult["handleToggleTaskComplete"];
  handleDeleteTask: UseWorkspaceContentControllerResult["handleDeleteTask"];
  handleSpawnAgentsForTasks: (toolId: string, tasks: TaskCenterTaskReference[]) => Promise<void>;
  generateTasksRequest: { projectId: string; specPath: string; nonce: number } | null;
  setGenerateTasksRequest: Dispatch<SetStateAction<{ projectId: string; specPath: string; nonce: number } | null>>;
  isTaskBoardOpen: boolean;
  setIsTaskBoardOpen: Dispatch<SetStateAction<boolean>>;
  isSpecBrowserOpen: boolean;
  setIsSpecBrowserOpen: Dispatch<SetStateAction<boolean>>;
  isNoteBrowserOpen: boolean;
  setIsNoteBrowserOpen: Dispatch<SetStateAction<boolean>>;
  isCreatingSpec: boolean;
  isCreatingNote: boolean;
  openWorkspaceSpec: UseWorkspaceContentControllerResult["openWorkspaceSpec"];
  createWorkspaceSpec: UseWorkspaceContentControllerResult["createWorkspaceSpec"];
  handleDeleteSpec: UseWorkspaceContentControllerResult["handleDeleteSpec"];
  openWorkspaceNote: UseWorkspaceContentControllerResult["openWorkspaceNote"];
  createWorkspaceNote: UseWorkspaceContentControllerResult["createWorkspaceNote"];
  handleDeleteNote: UseWorkspaceContentControllerResult["handleDeleteNote"];
  uiState: UiState;
  uiCommands: Pick<
    AppUiCommands,
    | "clearSessionTabFocus"
    | "openCreateAgentDialog"
    | "openCreateTerminalDialog"
    | "openWorkspaceSwitcherDialog"
    | "openWorkspaceTerminalPresetsDialog"
    | "setDestroyAgentId"
    | "setInstallCommandDraft"
  >;
  openAddWorkspaceModal: () => Promise<AppState | null>;
  resolveInstallCommand: (toolId: string, template: string) => string;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  activeGridColumns: WorkspaceSessionViewsApi["activeGridColumns"];
  activeGridRows: WorkspaceSessionViewsApi["activeGridRows"];
  activeView: WorkspaceSessionViewsApi["activeView"];
  activeSplitViewCollection: WorkspaceSplitViewCollection;
  activeWorkspaceContentTab: "file" | "diff" | null;
  addForgeWorkItemComment: (payload: ForgeAddCommentPayload) => Promise<void>;
  focusedAgent: AgentSession | null;
  focusedAiChatTab: AiChatTabState | null;
  aiModelLoading: UseAiModelCatalogResult["aiModelLoading"];
  aiModelOptions: UseAiModelCatalogResult["aiModelOptions"];
  appSettings: AppSettings;
  focusedBrowserTab: BrowserTabState | null;
  closeAiChatTab: (tabId: string) => void;
  closeBrowserTab: (tabId: string) => void;
  closeForgeViewerTab: (tabId: string) => void;
  createTerminalWithStatus: (payload: CreateTerminalPayload) => Promise<AppState | null>;
  fileEditorState: FileEditorState | null;
  focusAiChatTab: (tabId: string) => void;
  focusBrowserTab: (tabId: string) => void;
  focusForgeViewerTab: (tabId: string) => void;
  isPerformingForgeWorkItemAction: boolean;
  isPostingForgeWorkItemComment: boolean;
  forgeWorkItemDetail: ForgeWorkItemDetail | null;
  forgeWorkItemDetailErrorMessage: string | null;
  isLoadingForgeWorkItemDetail: boolean;
  forgeOverview: ForgeOverview | null;
  focusedForgeViewerTab: ForgeViewerTabState | null;
  handleOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  handleSelectAiChatProviderModel: UseAiModelCatalogResult["handleSelectAiChatProviderModel"];
  handleSpawnForgeIssueAgent: (toolId: string) => Promise<void>;
  handleSpawnForgeReviewAgent: (
    toolId: string,
    selections: ForgeReviewCommentSelection[],
    targetMode: ForgeReviewAgentTargetMode
  ) => Promise<void>;
  isCenterDiffExpanded: boolean;
  isCenterFullDiffExpanded: boolean;
  loadForgeWorkItemDetail: (kind: ForgeWorkItemKind, number: number, repoOverride?: { host: string; fullName: string } | null) => Promise<void>;
  openAiChat: (projectId: string) => void;
  openFileEditor: (pathName: string, options?: { selectChange?: boolean; rootPath?: string | null }) => Promise<void>;
  openForgeViewer: (projectId: string, kind: ForgeWorkItemKind | "workflow_run", number: number, title: string, repoOverride?: { host: string; fullName: string } | null) => void;
  openSettingsPage: (group?: SettingsGroup) => void;
  performForgeWorkItemAction: (action: ForgeWorkItemAction) => void | Promise<void>;
  windowUiStatePlatform: WindowUiState["platform"];
  refreshForgeOverview: () => void;
  resolveGitlabForgeRepoOverride: (item: ForgeWorkItemSummary) => { host: string; fullName: string } | null;
  saveFileEditor: (pathName?: string) => void | Promise<void>;
  selectedChange: ChangeEntry | null;
  setActiveWorkspaceContentTab: Dispatch<SetStateAction<"file" | "diff" | null>>;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setIsCenterFullDiffExpanded: Dispatch<SetStateAction<boolean>>;
  splitViewsErrorMessage: string | null;
  splitViewsLoading: boolean;
  terminalFontId: TerminalFontId;
  terminalThemeId: TerminalThemeId;
  focusedTerminal: TerminalSession | null;
  updateAiChatTabMessages: (tabId: string, updater: (current: AiChatMessage[]) => AiChatMessage[]) => void;
  updateAiChatTabReasoningMode: (tabId: string, mode: AiChatReasoningLevel) => void;
  updateAiChatTabTitle: (tabId: string, title: string) => void;
  updateBrowserTab: (tabId: string, updater: (current: BrowserTabState) => BrowserTabState) => void;
  focusedWorkspace: WorkspaceSummary | null;
  workspaceSessionViews: WorkspaceSessionViewsApi;
} & Pick<AppMainCenterContentValue, "shouldShowProjectSelectorScreen">;

export type UseAppCenterContentValueResult = AppMainCenterContentValue;
