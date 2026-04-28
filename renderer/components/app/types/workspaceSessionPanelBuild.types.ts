import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { WorkspaceSessionViewsApi } from "@/components/app/hooks/useWorkspaceSessionViews";
import type { FileEditorState, TaskEditorState } from "@/components/app/types";
import type { UseWorkspaceContentControllerResult } from "@/components/app/types/appHooks.types";
import type { WorkspaceSessionPanelProps } from "@/components/app/types/panel.types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type {
  AppState,
  CreateTerminalPayload,
  ForgeWorkItemAction,
  ForgeWorkItemKind,
  ForgeWorkItemSummary
} from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

type WorkspaceSessionPanelDataDepsKeys =
  | "activeGridColumns"
  | "activeGridRows"
  | "activeView"
  | "activeWorkspaceContentTab"
  | "addFocusedLabel"
  | "agent"
  | "aiChatTab"
  | "aiChatTabs"
  | "aiModelLoading"
  | "aiModelOptions"
  | "aiSettings"
  | "browserTab"
  | "browserTabs"
  | "canAddCurrentItem"
  | "fileEditorState"
  | "forgeActionLoading"
  | "forgeCommentLoading"
  | "forgeDetail"
  | "forgeDetailErrorMessage"
  | "forgeDetailLoading"
  | "forgeOverview"
  | "forgeViewerTab"
  | "forgeViewerTabs"
  | "isDiffExpanded"
  | "platform"
  | "project"
  | "projectScripts"
  | "resolvedTheme"
  | "selectedDiffChange"
  | "showSessionTabs"
  | "splitViewCollection"
  | "splitViews"
  | "splitViewsErrorMessage"
  | "splitViewsLoading"
  | "terminal"
  | "terminalFontId"
  | "terminalQuickLaunchDefaults"
  | "terminalShells"
  | "terminalThemeId"
  | "tools"
  | "workspace";

export type WorkspaceSessionPanelDataDeps = Pick<WorkspaceSessionPanelProps, WorkspaceSessionPanelDataDepsKeys>;

export type WorkspaceSessionPanelOrchestrationDeps = {
  addForgeWorkItemComment: WorkspaceSessionPanelProps["onForgeCommentSubmit"];
  closeAiChatTab: WorkspaceSessionPanelProps["onCloseAiChatTab"];
  closeBrowserTab: WorkspaceSessionPanelProps["onCloseBrowserTab"];
  closeForgeViewerTab: WorkspaceSessionPanelProps["onCloseForgeViewerTab"];
  createTerminalWithStatus: (payload: CreateTerminalPayload) => Promise<AppState | null>;
  createWorkspaceSpec: UseWorkspaceContentControllerResult["createWorkspaceSpec"];
  createWorkspaceTask: UseWorkspaceContentControllerResult["createWorkspaceTask"];
  focusAiChatTab: WorkspaceSessionPanelProps["onFocusAiChatTab"];
  focusBrowserTab: WorkspaceSessionPanelProps["onFocusBrowserTab"];
  focusForgeViewerTab: WorkspaceSessionPanelProps["onFocusForgeViewerTab"];
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  handleOpenWorkspaceBrowser: WorkspaceSessionPanelProps["onOpenWorkspaceBrowser"];
  handleSelectAiChatProviderModel: WorkspaceSessionPanelProps["onSelectAiChatProviderModel"];
  handleSpawnForgeIssueAgent: WorkspaceSessionPanelProps["onSpawnIssueAgent"];
  loadForgeWorkItemDetail: (
    kind: ForgeWorkItemKind,
    number: number,
    repoOverride?: { host: string; fullName: string } | null
  ) => Promise<void>;
  openAddWorkspaceModal: WorkspaceSessionPanelProps["onChooseProject"];
  openAiChat: WorkspaceSessionPanelProps["onOpenAiChat"];
  openForgeViewer: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    title: string,
    repoOverride?: { host: string; fullName: string } | null
  ) => void;
  openSettingsPage: (group?: SettingsGroup) => void;
  performForgeWorkItemAction: (action: ForgeWorkItemAction) => void | Promise<void>;
  refreshForgeOverview: WorkspaceSessionPanelProps["onRefreshForge"];
  resolveGitlabForgeRepoOverride: (item: ForgeWorkItemSummary) => { host: string; fullName: string } | null;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  saveFileEditor: () => void | Promise<void>;
  setActiveWorkspaceContentTab: Dispatch<SetStateAction<"file" | "diff" | null>>;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  setGenerateTasksRequest: Dispatch<SetStateAction<{ projectId: string; specPath: string; nonce: number } | null>>;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setIsNoteBrowserOpen: Dispatch<SetStateAction<boolean>>;
  setIsSpecBrowserOpen: Dispatch<SetStateAction<boolean>>;
  setIsTaskBoardOpen: Dispatch<SetStateAction<boolean>>;
  setTaskEditorState: Dispatch<SetStateAction<TaskEditorState | null>>;
  uiCommands: Pick<
    AppUiCommands,
    | "clearSessionTabFocus"
    | "openCreateAgentDialog"
    | "openCreateTerminalDialog"
    | "openWorkspaceSwitcherDialog"
    | "openWorkspaceTerminalPresetsDialog"
    | "setDestroyAgentId"
  >;
  updateAiChatTabMessages: WorkspaceSessionPanelProps["onUpdateAiChatTabMessages"];
  updateAiChatTabReasoningMode: WorkspaceSessionPanelProps["onUpdateAiChatTabReasoningMode"];
  updateAiChatTabTitle: WorkspaceSessionPanelProps["onUpdateAiChatTabTitle"];
  updateBrowserTab: WorkspaceSessionPanelProps["onUpdateBrowserTab"];
  workspaceSessionViews: WorkspaceSessionViewsApi;
};

export type WorkspaceSessionPanelBuildDeps = WorkspaceSessionPanelDataDeps & WorkspaceSessionPanelOrchestrationDeps;
