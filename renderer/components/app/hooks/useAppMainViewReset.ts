import type {
  ResetWorkspaceMainSurfaceOptions,
  UseAppMainViewResetArgs,
  UseAppMainViewResetResult
} from "@/components/app/types/appMainViewReset.types";
import { useCallback } from "react";

const DEFAULT_RESET_OPTIONS: Required<ResetWorkspaceMainSurfaceOptions> = {
  setMainView: true,
  clearFocusedBrowserTab: true,
  clearFocusedForgeViewerTab: true,
  clearFocusedAiChatTab: true
};

export function useAppMainViewReset({
  setActiveView,
  setIsCenterDiffExpanded,
  setIsTaskBoardOpen,
  setIsSpecBrowserOpen,
  setIsNoteBrowserOpen,
  setTaskEditorState,
  setWorkspaceSessionActiveViewId,
  setUiState
}: UseAppMainViewResetArgs): UseAppMainViewResetResult {
  const resetWorkspaceMainSurface = useCallback((options?: ResetWorkspaceMainSurfaceOptions): void => {
    const resolvedOptions = {
      ...DEFAULT_RESET_OPTIONS,
      ...options
    };

    if (resolvedOptions.setMainView) {
      setActiveView("main");
    }
    setIsCenterDiffExpanded(false);
    setIsTaskBoardOpen(false);
    setIsSpecBrowserOpen(false);
    setIsNoteBrowserOpen(false);
    setTaskEditorState(null);
    setWorkspaceSessionActiveViewId(null);
    setUiState((current) => {
      const nextFocusedBrowserTabId = resolvedOptions.clearFocusedBrowserTab ? null : current.focusedBrowserTabId;
      const nextFocusedForgeViewerTabId = resolvedOptions.clearFocusedForgeViewerTab ? null : current.focusedForgeViewerTabId;
      const nextFocusedAiChatTabId = resolvedOptions.clearFocusedAiChatTab ? null : current.focusedAiChatTabId;
      if (
        nextFocusedBrowserTabId === current.focusedBrowserTabId
        && nextFocusedForgeViewerTabId === current.focusedForgeViewerTabId
        && nextFocusedAiChatTabId === current.focusedAiChatTabId
      ) {
        return current;
      }
      return {
        ...current,
        focusedBrowserTabId: nextFocusedBrowserTabId,
        focusedForgeViewerTabId: nextFocusedForgeViewerTabId,
        focusedAiChatTabId: nextFocusedAiChatTabId
      };
    });
  }, [
    setActiveView,
    setIsCenterDiffExpanded,
    setIsNoteBrowserOpen,
    setIsSpecBrowserOpen,
    setIsTaskBoardOpen,
    setTaskEditorState,
    setUiState,
    setWorkspaceSessionActiveViewId
  ]);

  return {
    resetWorkspaceMainSurface
  };
}
