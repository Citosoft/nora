import type { TaskEditorState, UiState } from "@/components/app/types";
import type { ResetWorkspaceMainSurfaceOptions } from "@/components/app/types/appMainViewReset.types";
import type { AppState } from "@shared/appTypes";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

export type UseAppRootWorkspaceMainSurfaceArgs = {
  lastFocusedSessionRef: MutableRefObject<{ agentId: string | null; terminalId: string | null }>;
  safely: (action: () => Promise<AppState>) => Promise<AppState | null>;
  setActiveView: Dispatch<SetStateAction<"main" | "settings">>;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setIsTaskBoardOpen: Dispatch<SetStateAction<boolean>>;
  setIsSpecBrowserOpen: Dispatch<SetStateAction<boolean>>;
  setIsNoteBrowserOpen: Dispatch<SetStateAction<boolean>>;
  setTaskEditorState: Dispatch<SetStateAction<TaskEditorState | null>>;
  setWorkspaceSessionActiveViewId: (viewId: string | null) => void;
  setUiState: Dispatch<SetStateAction<UiState>>;
  openTaskEditor: (projectId: string, pathName: string) => Promise<void>;
  focusWorkspaceWithRecovery: (projectId: string) => Promise<AppState | null>;
  openWorkspaceSpec: (projectId: string, pathName: string) => Promise<void>;
  openWorkspaceNote: (projectId: string, pathName: string) => Promise<void>;
  openFileEditor: (pathName: string, options?: { selectChange?: boolean; rootPath?: string | null }) => Promise<void>;
  workspaceFilesRootPath: string | null;
  uiCommands: {
    setFocusedAiChatTabId: (tabId: string | null) => void;
  };
};

export type UseAppRootWorkspaceMainSurfaceResult = {
  resetWorkspaceMainSurface: (options?: ResetWorkspaceMainSurfaceOptions) => void;
  focusWorkspaceAiChatTab: (projectId: string, tabId: string) => void;
  handleWorkspaceQuickSearchPick: (
    pick: import("@/components/app/types/titlebarWorkspaceSearch.types").WorkspaceQuickSearchPick
  ) => void;
};
