import {
  buildCloseDirtyFileEditorTabMessage,
  closeFileEditorTab,
  findFileEditorTab
} from "@/components/app/logic/fileEditorTabs";
import type { RequestCloseFileEditorTabInput } from "@/components/app/types/requestCloseFileEditorTab.types";

export const requestCloseFileEditorTab = (input: RequestCloseFileEditorTabInput): void => {
  const closingTab = findFileEditorTab(input.fileEditorState, input.pathName);
  const confirmMessage = closingTab ? buildCloseDirtyFileEditorTabMessage(closingTab) : null;
  if (confirmMessage && !window.confirm(confirmMessage)) {
    return;
  }

  const nextFileEditorState = closeFileEditorTab(input.fileEditorState, input.pathName);
  input.setFileEditorState((current) => closeFileEditorTab(current, input.pathName));
  input.setActiveWorkspaceContentTab((current) =>
    current === "file"
      ? ((nextFileEditorState?.tabs.length ?? 0) > 0 ? "file" : input.isDiffExpanded ? "diff" : null)
      : current
  );
};
