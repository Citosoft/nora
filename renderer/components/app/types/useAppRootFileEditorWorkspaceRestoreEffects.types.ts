import type { FileEditorState, StoredWorkspaceContentState } from "@/components/app/types";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

export type UseAppRootFileEditorWorkspaceRestoreEffectsArgs = {
  workspaceContentRestoredRef: MutableRefObject<boolean>;
  storedWorkspaceContentState: StoredWorkspaceContentState;
  openFileEditor: (
    path: string,
    options: { selectChange: boolean; rootPath: string | null }
  ) => Promise<void>;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  setIsCenterDiffExpanded: Dispatch<SetStateAction<boolean>>;
  setActiveWorkspaceContentTab: Dispatch<SetStateAction<"file" | "diff" | null>>;
};

export type UseAppRootFileEditorActiveTabSyncEffectArgs = {
  fileEditorState: FileEditorState | null;
  isCenterDiffExpanded: boolean;
  setActiveWorkspaceContentTab: Dispatch<SetStateAction<"file" | "diff" | null>>;
};
