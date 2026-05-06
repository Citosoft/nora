import type {
  AiChatTabState,
  BrowserTabState,
  FileEditorState,
  ForgeViewerTabState,
  UiState
} from "@/components/app/types";
import type { useWorkspaceSplitViews } from "@/components/app/hooks/useWorkspaceSplitViews";

type WorkspaceSplitViewsBundle = ReturnType<typeof useWorkspaceSplitViews>;
import type {
  AgentSession,
  AppState,
  ChangeEntry,
  TerminalSession,
  WorkspaceSplitView,
  WorkspaceSplitViewCollection,
  WorkspaceSummary
} from "@shared/appTypes";

import type { WorkspaceSessionViewsHandle } from "@/components/app/types/workspaceSessionViewsHandle.types";

export type UseAppRootSessionSurfaceLayoutArgs = {
  uiState: UiState;
  fileEditorState: FileEditorState | null;
  activeWorkspaceContentTab: "file" | "diff" | null;
  isCenterDiffExpanded: boolean;
  isCenterFullDiffExpanded: boolean;
  selectedChange: ChangeEntry | null;
  workspaceSplitViews: WorkspaceSplitViewsBundle["workspaceSplitViews"];
  saveWorkspaceSplitViews: WorkspaceSplitViewsBundle["saveWorkspaceSplitViews"];
  defaultGridColumns: WorkspaceSplitView["gridColumns"];
  defaultGridRows: WorkspaceSplitView["gridRows"];
  rememberLastViewPerWorkspace: boolean;
  confirmDeleteView: boolean;
  captureError: (error: unknown) => void;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  openAiChat: (projectId: string) => void;
};

export type UseAppRootSessionSurfaceLayoutResult = {
  focusedAgent: AgentSession | null;
  focusedTerminal: TerminalSession | null;
  focusedWorkspace: WorkspaceSummary | null;
  focusedBrowserTab: BrowserTabState | null;
  focusedForgeViewerTab: ForgeViewerTabState | null;
  focusedAiChatTab: AiChatTabState | null;
  hasActiveWorkspace: boolean;
  activeSplitViewCollection: WorkspaceSplitViewCollection;
  shouldShowProjectSelectorScreen: boolean;
  splitViewsLoading: boolean;
  splitViewsErrorMessage: string | null;
  workspaceSessionViews: WorkspaceSessionViewsHandle;
  openAiChatFromSidebar: (projectId: string) => void;
};
