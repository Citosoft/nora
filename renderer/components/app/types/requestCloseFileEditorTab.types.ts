import type { FileEditorState } from "@/components/app/types";
import type { Dispatch, SetStateAction } from "react";

export type RequestCloseFileEditorTabInput = {
  pathName: string;
  fileEditorState: FileEditorState | null;
  isDiffExpanded: boolean;
  setFileEditorState: Dispatch<SetStateAction<FileEditorState | null>>;
  setActiveWorkspaceContentTab: Dispatch<SetStateAction<"file" | "diff" | null>>;
};
