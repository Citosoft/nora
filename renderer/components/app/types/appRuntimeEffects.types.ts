import type { FileEditorState, TaskEditorState, UiState, WorkspaceLoadingState } from "@/components/app/types";
import type { AppState, ChangeEntry, LocalTerminalState } from "@shared/appTypes";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

export type UseAppRuntimeEffectsArgs = {
  activeWorkspaceContentTab: "file" | "diff" | null;
  fileEditorState: FileEditorState | null;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  setUiState: Dispatch<SetStateAction<UiState>>;
  setAppClosingState: Dispatch<SetStateAction<{ detail: string; command: string | null } | null>>;
  localTerminalState: LocalTerminalState | null;
  setLocalTerminalState: Dispatch<SetStateAction<LocalTerminalState | null>>;
  workspaceLoading: WorkspaceLoadingState | null;
  isAddingWorkspace: boolean;
  isRemoteMountedWorkspace: boolean;
  refreshSnapshot: (statusMessage: string) => Promise<void>;
  activityRefreshTimeoutRef: MutableRefObject<number | null>;
  taskRefreshTimeoutRef: MutableRefObject<number | null>;
  reloadWorkspaceTasksForProject: (projectId: string) => Promise<void>;
  selectedChange: ChangeEntry | null;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setTaskEditorState: Dispatch<SetStateAction<TaskEditorState | null>>;
  addWorkspaceBaselineSignatureRef: MutableRefObject<string>;
  finishAddingWorkspace: () => void;
  getWorkspacePresenceSignature: (snapshot: AppState | null) => string;
};
