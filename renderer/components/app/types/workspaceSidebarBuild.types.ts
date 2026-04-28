import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { FileEditorState, UiState } from "@/components/app/types";
import type { UseWorkspaceContentControllerResult } from "@/components/app/types/appHooks.types";
import type { SettingsGroup } from "@/components/app/types/settings.types";
import type { WorkspaceSidebarProps } from "@/components/app/types/workflow.types";
import type { AppState, CreateTerminalPayload, WorkspaceSummary } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type WorkspaceSidebarBuildDeps = Pick<
  UseWorkspaceContentControllerResult,
  | "createWorkspaceNote"
  | "createWorkspaceSpec"
  | "createWorkspaceTask"
  | "handleDeleteNote"
  | "handleDeleteSpec"
  | "handleDeleteTask"
  | "handleToggleTaskComplete"
  | "isCreatingNote"
  | "isCreatingSpec"
  | "openTaskEditor"
  | "openWorkspaceNote"
  | "openWorkspaceSpec"
  | "setGenerateTasksRequest"
  | "setIsNoteBrowserOpen"
  | "setIsSpecBrowserOpen"
  | "setIsTaskBoardOpen"
  | "setTaskEditorState"
  | "taskEditorState"
> & {
  agentsNeedingAttention: WorkspaceSidebarProps["agentsNeedingAttention"];
  collapsedWorkspaceIds: WorkspaceSidebarProps["collapsedWorkspaceIds"];
  focusWorkspaceAiChatTab: (projectId: string, tabId: string) => void;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  focusedAgent: WorkspaceSidebarProps["focusedAgent"];
  focusedTerminal: WorkspaceSidebarProps["focusedTerminal"];
  focusedWorkspace: WorkspaceSummary | null;
  githubToken: string;
  gitlabHost: string;
  gitlabToken: string;
  handleChooseWorkspaceAtPath: (defaultPath: string, title?: string) => Promise<void>;
  handleOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  handleRemoveWorkspace: (projectRoot: string) => Promise<void>;
  isChatbotsSectionCollapsed: boolean;
  isCliSectionCollapsed: boolean;
  isPortsSectionCollapsed: boolean;
  isRemoteMountsSectionCollapsed: boolean;
  isWorkspaceSidebarCollapsed: boolean;
  launchTerminalInWorkspace: (projectId: string, payload: CreateTerminalPayload) => Promise<void>;
  openAddWorkspaceModal: () => Promise<AppState | null>;
  openAiChatFromSidebar: (projectId: string) => void;
  openSettingsPage: (group?: SettingsGroup) => void;
  removingWorkspaceRoots: WorkspaceSidebarProps["removingWorkspaceRoots"];
  resolveInstallCommand: (toolId: string, installTemplate: string) => string;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  setCollapsedWorkspaceIds: Dispatch<SetStateAction<Record<string, boolean>>>;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setIsChatbotsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsCliSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsPortsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsRemoteMountsSectionCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsWorkspaceSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  setWorkspaceSessionActiveViewId: Dispatch<SetStateAction<string | null>>;
  activeProjectId: string | null;
  agentCatalog: AppState["agentCatalog"];
  terminalPresets: WorkspaceSidebarProps["terminalPresets"];
  terminalQuickLaunchDefaults: WorkspaceSidebarProps["terminalQuickLaunchDefaults"];
  uiCommands: Pick<
    AppUiCommands,
    | "clearBrowserAndForgeFocus"
    | "clearSessionTabFocus"
    | "openCreateAgentDialog"
    | "openCreateTerminalDialog"
    | "openResetWorkspacesDialog"
    | "openWorkspaceTerminalPresetsDialog"
    | "setDestroyAgentId"
    | "setInstallCommandDraft"
  >;
  workspaceNotes: WorkspaceSidebarProps["workspaceNotes"];
  workspaceSidebarUiState: Pick<UiState, "aiChatTabs" | "focusedAiChatTabId" | "installCommandDrafts">;
  workspaceSpecs: WorkspaceSidebarProps["workspaceSpecs"];
  workspaceTasks: WorkspaceSidebarProps["workspaceTasks"];
};
