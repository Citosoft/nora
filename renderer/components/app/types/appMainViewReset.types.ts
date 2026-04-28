import type { TaskEditorState, UiState } from "@/components/app/types";
import type { Dispatch, SetStateAction } from "react";

export type ResetWorkspaceMainSurfaceOptions = {
  setMainView?: boolean;
  clearFocusedBrowserTab?: boolean;
  clearFocusedForgeViewerTab?: boolean;
  clearFocusedAiChatTab?: boolean;
};

export type UseAppMainViewResetArgs = {
  setActiveView: Dispatch<SetStateAction<"main" | "settings">>;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setIsTaskBoardOpen: Dispatch<SetStateAction<boolean>>;
  setIsSpecBrowserOpen: Dispatch<SetStateAction<boolean>>;
  setIsNoteBrowserOpen: Dispatch<SetStateAction<boolean>>;
  setTaskEditorState: Dispatch<SetStateAction<TaskEditorState | null>>;
  setWorkspaceSessionActiveViewId: (viewId: string | null) => void;
  setUiState: Dispatch<SetStateAction<UiState>>;
};

export type UseAppMainViewResetResult = {
  resetWorkspaceMainSurface: (options?: ResetWorkspaceMainSurfaceOptions) => void;
};
