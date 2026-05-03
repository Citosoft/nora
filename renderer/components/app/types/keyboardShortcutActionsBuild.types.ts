import type { AppUiCommands } from "@/components/app/hooks/useAppUiCommands";
import type { WorkspaceSessionFocusCommands } from "@/components/app/hooks/useWorkspaceSessionFocusCommands";
import type { AppView, FileEditorState, UiState } from "@/components/app/types";
import type { AppSettings, AppState, ChangeEntry, CreateTerminalPayload, WorkspaceSplitView } from "@shared/appTypes";
import type { Dispatch, SetStateAction } from "react";

export type KeyboardShortcutActionsBuildDeps = {
  activeWorkspaceContentTab: "file" | "diff" | null;
  appSettingsTerminalQuickLaunchDefaults: AppSettings["terminalQuickLaunchDefaults"];
  createTerminalWithStatus: (payload: CreateTerminalPayload) => Promise<AppState | null>;
  defaultTerminalShellId: string | null;
  fileEditorState: FileEditorState | null;
  focusLocalTerminalDock: () => void | Promise<void>;
  handleOpenWorkspaceBrowser: (projectId: string, url?: string) => void;
  isCenterDiffExpanded: boolean;
  isCenterFullDiffExpanded: boolean;
  openSettingsPage: () => void;
  openStartupDependenciesDialog: () => void;
  sessionFocusCommands: WorkspaceSessionFocusCommands;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  selectedChange: ChangeEntry | null;
  sessionSurfaceSplitViews: WorkspaceSplitView[];
  workspaceSessionActiveViewId: string | null;
  setActiveView: Dispatch<SetStateAction<AppView>>;
  setActiveWorkspaceContentTab: Dispatch<SetStateAction<"file" | "diff" | null>>;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setIsCenterFullDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setIsChangesSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsLocalTerminalDockCollapsed: Dispatch<SetStateAction<boolean>>;
  setIsWorkspaceSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  setWorkspaceQuickSearchRequestId: Dispatch<SetStateAction<number>>;
  snapshot: AppState | null;
  uiCommands: Pick<
    AppUiCommands,
    | "openAddWorkspaceDialog"
    | "openCreateAgentDialog"
    | "openCreateTerminalDialog"
    | "openKeyboardShortcutsDialog"
    | "openWorkspaceSwitcherDialog"
    | "setDestroyAgentId"
  >;
  closeBrowserTab: (tabId: string) => void;
  closeForgeViewerTab: (tabId: string) => void;
  closeAiChatTab: (tabId: string) => void;
  deleteWorkspaceSplitViewById: (viewId: string) => Promise<boolean>;
  uiState: Pick<
    UiState,
    | "aiChatTabs"
    | "browserTabs"
    | "focusedAiChatTabId"
    | "focusedBrowserTabId"
    | "focusedForgeViewerTabId"
    | "forgeViewerTabs"
  >;
};
