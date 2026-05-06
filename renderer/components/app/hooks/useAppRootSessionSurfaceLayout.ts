import { getWorkspaceSessionTabs } from "@/components/app/logic/workspaceSessionTabs";
import {
  getFocusedAgent,
  getFocusedTerminal,
  getFocusedWorkspace
} from "@/components/app/logic/appUtils";
import type {
  UseAppRootSessionSurfaceLayoutArgs,
  UseAppRootSessionSurfaceLayoutResult
} from "@/components/app/types/useAppRootSessionSurfaceLayout.types";
import { useWorkspaceSessionViews } from "@/components/app/hooks/useWorkspaceSessionViews";
import { createDefaultWorkspaceSplitViewCollection } from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback } from "react";

export const useAppRootSessionSurfaceLayout = ({
  uiState,
  fileEditorState,
  activeWorkspaceContentTab,
  isCenterDiffExpanded,
  isCenterFullDiffExpanded,
  selectedChange,
  workspaceSplitViews,
  saveWorkspaceSplitViews,
  defaultGridColumns,
  defaultGridRows,
  rememberLastViewPerWorkspace,
  confirmDeleteView,
  captureError,
  focusWorkspaceWithRecovery,
  openAiChat
}: UseAppRootSessionSurfaceLayoutArgs): UseAppRootSessionSurfaceLayoutResult => {
  const snapshot = useCanonicalAppSnapshot();
  const focusedAgent = snapshot ? getFocusedAgent(snapshot) : null;
  const focusedTerminal = snapshot ? getFocusedTerminal(snapshot) : null;
  const focusedWorkspace = snapshot ? getFocusedWorkspace(snapshot) : null;
  const focusedBrowserTab =
    focusedWorkspace && uiState.focusedBrowserTabId
      ? uiState.browserTabs.find(
          (tab) => tab.id === uiState.focusedBrowserTabId && tab.projectId === focusedWorkspace.project.id
        ) ?? null
      : null;
  const focusedForgeViewerTab =
    focusedWorkspace && uiState.focusedForgeViewerTabId
      ? uiState.forgeViewerTabs.find(
          (tab) => tab.id === uiState.focusedForgeViewerTabId && tab.projectId === focusedWorkspace.project.id
        ) ?? null
      : null;
  const focusedAiChatTab =
    focusedWorkspace && uiState.focusedAiChatTabId
      ? uiState.aiChatTabs.find(
          (tab) => tab.id === uiState.focusedAiChatTabId && tab.projectId === focusedWorkspace.project.id
        ) ?? null
      : null;
  const activeFileEditorTab =
    focusedWorkspace && fileEditorState
      ? fileEditorState.tabs.find(
          (tab) => tab.path === fileEditorState.activePath && tab.projectId === focusedWorkspace.project.id
        ) ?? fileEditorState.tabs.find((tab) => tab.projectId === focusedWorkspace.project.id) ?? null
      : null;
  const hasActiveWorkspace = !!snapshot?.project;
  const activeSplitViewCollection =
    snapshot?.project
      ? workspaceSplitViews[snapshot.project.id]?.collection ?? createDefaultWorkspaceSplitViewCollection()
      : createDefaultWorkspaceSplitViewCollection();
  const activeWorkspaceSessionTabs = snapshot
    ? getWorkspaceSessionTabs(
        focusedWorkspace,
        uiState.browserTabs,
        uiState.aiChatTabs,
        uiState.forgeViewerTabs,
        activeSplitViewCollection.views,
        fileEditorState?.tabs ?? [],
        isCenterDiffExpanded
          ? (isCenterFullDiffExpanded ? "__all_changes__" : (selectedChange ? selectedChange.path : null))
          : null,
        isCenterDiffExpanded && isCenterFullDiffExpanded ? (snapshot?.changes.length ?? 0) : undefined
      )
    : [];
  const shouldShowProjectSelectorScreen =
    !!snapshot && !snapshot.project && activeWorkspaceSessionTabs.length === 0;
  const splitViewsLoading = snapshot?.project ? workspaceSplitViews[snapshot.project.id]?.isLoading ?? false : false;
  const splitViewsErrorMessage = snapshot?.project
    ? workspaceSplitViews[snapshot.project.id]?.errorMessage ?? null
    : null;

  const workspaceSessionViews = useWorkspaceSessionViews({
    projectId: snapshot?.project?.id ?? null,
    agent: focusedAgent,
    terminal: focusedTerminal,
    browserTab: focusedBrowserTab,
    activeFileEditorTab,
    activeWorkspaceContentTab,
    defaultGridColumns,
    defaultGridRows,
    rememberLastViewPerWorkspace,
    confirmDeleteView,
    splitViewCollection: activeSplitViewCollection,
    onSaveSplitViews: saveWorkspaceSplitViews,
    onError: captureError
  });

  const openAiChatFromSidebar = useCallback(
    (projectId: string) => {
      void focusWorkspaceWithRecovery(projectId).then((next) => {
        if (!next) {
          return;
        }
        openAiChat(projectId);
      });
    },
    [focusWorkspaceWithRecovery, openAiChat]
  );

  return {
    focusedAgent,
    focusedTerminal,
    focusedWorkspace,
    focusedBrowserTab,
    focusedForgeViewerTab,
    focusedAiChatTab,
    hasActiveWorkspace,
    activeSplitViewCollection,
    shouldShowProjectSelectorScreen,
    splitViewsLoading,
    splitViewsErrorMessage,
    workspaceSessionViews,
    openAiChatFromSidebar
  };
};
