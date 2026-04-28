import { useAppRootShellState } from "@/components/app/context/appRootShellStateContext";
import { useAppRootState } from "@/components/app/context/appRootStateContext";
import {
  useAppRootFileEditorActiveTabSyncEffect,
  useAppRootFileEditorWorkspaceRestoreEffects
} from "@/components/app/hooks/useAppRootFileEditorWorkspaceRestoreEffects";
import { useAppRootSessionSurfaceLayout } from "@/components/app/hooks/useAppRootSessionSurfaceLayout";
import { useAppRootSignedInSecondaryWiring } from "@/components/app/hooks/useAppRootSignedInSecondaryWiring";
import { useAppRootWorkspaceMainSurface } from "@/components/app/hooks/useAppRootWorkspaceMainSurface";
import { useAppRootWorkspaceSessionActions } from "@/components/app/hooks/useAppRootWorkspaceSessionActions";
import { useWorkspaceContentController } from "@/components/app/hooks/useWorkspaceContentController";
import { useWorkspaceFileMutations } from "@/components/app/hooks/useWorkspaceFileMutations";
import { useWorkspaceResources } from "@/components/app/hooks/useWorkspaceResources";
import { useWorkspaceSplitViews } from "@/components/app/hooks/useWorkspaceSplitViews";
import { useWorkspaceTaskBoards } from "@/components/app/hooks/useWorkspaceTaskBoards";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { getSelectedChange, isRemoteMountedProject } from "@/components/app/logic/appUtils";
import type {
  AppRootWorkspaceSessionContextValue,
  AppRootWorkspaceSessionProviderProps
} from "@/components/app/types/appRootWorkspaceSessionContext.types";
import type { UseWorkspaceContentControllerResult } from "@/components/app/types/appHooks.types";
import { createContext, useContext, useMemo, useRef, type ReactElement } from "react";

const AppRootWorkspaceSessionContext = createContext<AppRootWorkspaceSessionContextValue | null>(null);

export function AppRootWorkspaceSessionProvider({
  appSettings,
  storedWorkspaceContentState,
  safely,
  safelyAndRefresh,
  runWithStatus,
  updateSnapshotState,
  focusWorkspaceWithRecovery,
  captureError,
  openAiChat,
  uiCommands,
  normalizeSnapshot,
  windowPlatform,
  setDefaultTerminalShellId,
  installedIdes,
  defaultIdeId,
  statusBar,
  trackAgentCreation,
  children
}: AppRootWorkspaceSessionProviderProps): ReactElement {
  const { uiState, setUiState } = useAppRootState();
  const snapshot = useCanonicalAppSnapshot();
  const {
    isCenterDiffExpanded,
    setActiveView,
    setActiveWorkspaceContentTab,
    setIsCenterDiffExpanded
  } = useAppRootShellState();
  const workspaceContentRestoredRef = useRef(false);
  const lastFocusedSessionRef = useRef<{ agentId: string | null; terminalId: string | null }>({
    agentId: null,
    terminalId: null
  });
  const selectedChange = snapshot ? getSelectedChange(snapshot) : null;
  const isRemoteMountedWorkspace = isRemoteMountedProject(snapshot);
  const resources = useWorkspaceResources();
  const { workspaceTaskBoards, updateWorkspaceTaskBoard } = useWorkspaceTaskBoards();
  const { workspaceSplitViews, saveWorkspaceSplitViews } = useWorkspaceSplitViews();
  const sessionActions = useAppRootWorkspaceSessionActions({
    safely,
    runWithStatus,
    focusWorkspaceWithRecovery,
    setUiState,
    onOpenEditor: () => {
      setTaskEditorState(null);
      setActiveWorkspaceContentTab("file");
    },
    reloadWorkspaceNotesForProject: resources.reloadWorkspaceNotesForProject,
    reloadWorkspaceSpecsForProject: resources.reloadWorkspaceSpecsForProject
  });
  const layout = useAppRootSessionSurfaceLayout({
    uiState,
    fileEditorState: sessionActions.fileEditorState,
    isCenterDiffExpanded,
    selectedChange,
    workspaceSplitViews,
    saveWorkspaceSplitViews,
    defaultGridColumns: appSettings.defaultSplitViewGridColumns,
    defaultGridRows: appSettings.defaultSplitViewGridRows,
    rememberLastViewPerWorkspace: appSettings.rememberLastSplitViewPerWorkspace,
    confirmDeleteView: appSettings.confirmSplitViewDelete,
    captureError,
    focusWorkspaceWithRecovery,
    openAiChat
  });
  const derived = useAppRootSignedInSecondaryWiring({
    uiStateDestroyAgentId: uiState.destroyAgentId,
    focusedAgent: layout.focusedAgent,
    focusedTerminal: layout.focusedTerminal,
    isRemoteMountedWorkspace,
    workspaceTasks: resources.workspaceTasks,
    workspaceSpecs: resources.workspaceSpecs,
    workspaceNotes: resources.workspaceNotes,
    workspaceFileTreePaths: resources.workspaceFileTree.paths,
    windowPlatform,
    setDefaultTerminalShellId,
    installedIdes,
    defaultIdeId,
    safely,
    captureError,
    normalizeSnapshot,
    workspaceFileTree: resources.workspaceFileTree
  });
  const {
    taskEditorState,
    setTaskEditorState,
    isCreatingSpec,
    isCreatingNote,
    isTaskBoardOpen,
    setIsTaskBoardOpen,
    isSpecBrowserOpen,
    setIsSpecBrowserOpen,
    isNoteBrowserOpen,
    setIsNoteBrowserOpen,
    generateTasksRequest,
    setGenerateTasksRequest,
    openTaskEditor,
    createWorkspaceTask,
    openWorkspaceSpec,
    createWorkspaceSpec,
    openWorkspaceNote,
    createWorkspaceNote,
    duplicateTaskToNew,
    saveTaskEditor,
    handleToggleTaskComplete,
    handleDeleteTask,
    handleDeleteSpec,
    handleDeleteNote,
    handleSpawnTaskAgent,
    handleSpawnAgentsForTasks,
    generateWorkspaceTasksWithAgent,
    handleCreateAgentFromDialog
  } = useWorkspaceContentController({
    workspaceTasks: resources.workspaceTasks,
    workspaceSpecs: resources.workspaceSpecs,
    workspaceNotes: resources.workspaceNotes,
    workspaceTaskBoards,
    updateWorkspaceTaskBoard,
    setWorkspaceTasks: resources.setWorkspaceTasks,
    setWorkspaceSpecs: resources.setWorkspaceSpecs,
    setWorkspaceNotes: resources.setWorkspaceNotes,
    reloadWorkspaceTasksForProject: resources.reloadWorkspaceTasksForProject,
    reloadWorkspaceSpecsForProject: resources.reloadWorkspaceSpecsForProject,
    reloadWorkspaceNotesForProject: resources.reloadWorkspaceNotesForProject,
    setFileEditorState: sessionActions.setFileEditorState,
    fileEditorState: sessionActions.fileEditorState,
    openFileEditor: sessionActions.openFileEditor,
    safelyAndRefresh,
    updateSnapshotState,
    captureError,
    focusWorkspaceWithRecovery,
    runWithStatus,
    statusBar,
    setIsCenterDiffExpanded,
    trackAgentCreation
  });
  const content: UseWorkspaceContentControllerResult = {
    taskEditorState,
    setTaskEditorState,
    isCreatingSpec,
    isCreatingNote,
    isTaskBoardOpen,
    setIsTaskBoardOpen,
    isSpecBrowserOpen,
    setIsSpecBrowserOpen,
    isNoteBrowserOpen,
    setIsNoteBrowserOpen,
    generateTasksRequest,
    setGenerateTasksRequest,
    openTaskEditor,
    createWorkspaceTask,
    openWorkspaceSpec,
    createWorkspaceSpec,
    openWorkspaceNote,
    createWorkspaceNote,
    duplicateTaskToNew,
    saveTaskEditor,
    handleToggleTaskComplete,
    handleDeleteTask,
    handleDeleteSpec,
    handleDeleteNote,
    handleSpawnTaskAgent,
    handleSpawnAgentsForTasks,
    generateWorkspaceTasksWithAgent,
    handleCreateAgentFromDialog
  };
  const fileMutations = useWorkspaceFileMutations({
    workspaceFileTree: resources.workspaceFileTree,
    setWorkspaceFileTree: resources.setWorkspaceFileTree,
    fileEditorState: sessionActions.fileEditorState,
    setFileEditorState: sessionActions.setFileEditorState,
    safely,
    statusBar
  });

  useAppRootFileEditorWorkspaceRestoreEffects({
    workspaceContentRestoredRef,
    storedWorkspaceContentState,
    openFileEditor: sessionActions.openFileEditor,
    setFileEditorState: sessionActions.setFileEditorState,
    setIsCenterDiffExpanded,
    setActiveWorkspaceContentTab
  });

  useAppRootFileEditorActiveTabSyncEffect({
    fileEditorState: sessionActions.fileEditorState,
    isCenterDiffExpanded,
    setActiveWorkspaceContentTab
  });

  const mainSurface = useAppRootWorkspaceMainSurface({
    lastFocusedSessionRef,
    safely,
    setActiveView,
    setIsCenterDiffExpanded,
    setIsTaskBoardOpen,
    setIsSpecBrowserOpen,
    setIsNoteBrowserOpen,
    setTaskEditorState,
    setWorkspaceSessionActiveViewId: layout.workspaceSessionViews.setActiveViewId,
    setUiState,
    openTaskEditor,
    focusWorkspaceWithRecovery,
    openWorkspaceSpec,
    openWorkspaceNote,
    openFileEditor: sessionActions.openFileEditor,
    workspaceFilesRootPath: resources.workspaceFileTree.rootPath,
    uiCommands
  });

  const value = useMemo<AppRootWorkspaceSessionContextValue>(() => ({
    resources: {
      ...resources,
      workspaceTaskBoards,
      updateWorkspaceTaskBoard,
      workspaceSplitViews,
      saveWorkspaceSplitViews
    },
    sessionActions,
    layout: {
      ...layout,
      selectedChange,
      isRemoteMountedWorkspace
    },
    content,
    fileMutations,
    derived,
    mainSurface
  }), [
    resources,
    workspaceTaskBoards,
    updateWorkspaceTaskBoard,
    workspaceSplitViews,
    saveWorkspaceSplitViews,
    sessionActions,
    layout,
    selectedChange,
    isRemoteMountedWorkspace,
    content,
    fileMutations,
    derived,
    mainSurface
  ]);

  return <AppRootWorkspaceSessionContext.Provider value={value}>{children}</AppRootWorkspaceSessionContext.Provider>;
}

export function useAppRootWorkspaceSession(): AppRootWorkspaceSessionContextValue {
  const value = useContext(AppRootWorkspaceSessionContext);
  if (!value) {
    throw new Error("useAppRootWorkspaceSession must be used within AppRootWorkspaceSessionProvider.");
  }

  return value;
}
