import { useAppMainViewReset } from "@/components/app/hooks/useAppMainViewReset";
import { useAppRootFocusedSessionMainSurfaceResetEffect } from "@/components/app/hooks/useAppRootFocusedSessionMainSurfaceResetEffect";
import { useWorkspaceQuickSearchActions } from "@/components/app/hooks/useWorkspaceQuickSearchActions";
import type {
  UseAppRootWorkspaceMainSurfaceArgs,
  UseAppRootWorkspaceMainSurfaceResult
} from "@/components/app/types/useAppRootWorkspaceMainSurface.types";
import { useCallback } from "react";

export function useAppRootWorkspaceMainSurface({
  lastFocusedSessionRef,
  safely,
  setActiveView,
  setIsCenterDiffExpanded,
  setIsTaskBoardOpen,
  setIsSpecBrowserOpen,
  setIsNoteBrowserOpen,
  setTaskEditorState,
  setWorkspaceSessionActiveViewId,
  setUiState,
  openTaskEditor,
  focusWorkspaceWithRecovery,
  openWorkspaceSpec,
  openWorkspaceNote,
  openFileEditor,
  workspaceFilesRootPath,
  uiCommands
}: UseAppRootWorkspaceMainSurfaceArgs): UseAppRootWorkspaceMainSurfaceResult {
  const { resetWorkspaceMainSurface } = useAppMainViewReset({
    setActiveView,
    setIsCenterDiffExpanded,
    setIsTaskBoardOpen,
    setIsSpecBrowserOpen,
    setIsNoteBrowserOpen,
    setTaskEditorState,
    setWorkspaceSessionActiveViewId,
    setUiState
  });

  const focusWorkspaceAiChatTab = useCallback(
    (projectId: string, tabId: string) => {
      void focusWorkspaceWithRecovery(projectId).then((next) => {
        if (!next) {
          return;
        }
        resetWorkspaceMainSurface({
          clearFocusedAiChatTab: false
        });
        uiCommands.setFocusedAiChatTabId(tabId);
      });
    },
    [focusWorkspaceWithRecovery, resetWorkspaceMainSurface, uiCommands]
  );

  const { handleWorkspaceQuickSearchPick } = useWorkspaceQuickSearchActions({
    safely,
    resetWorkspaceMainSurface,
    openTaskEditor,
    focusWorkspaceWithRecovery,
    openWorkspaceSpec,
    openWorkspaceNote,
    openFileEditor,
    workspaceFilesRootPath
  });

  useAppRootFocusedSessionMainSurfaceResetEffect({
    lastFocusedSessionRef,
    resetWorkspaceMainSurface
  });

  return {
    resetWorkspaceMainSurface,
    focusWorkspaceAiChatTab,
    handleWorkspaceQuickSearchPick
  };
}
