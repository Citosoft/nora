import { createWorkspaceSessionPanelValue } from "@/components/app/context/workspaceSessionPanelContext";
import { buildProjectSelectorScreenProps } from "@/components/app/logic/buildProjectSelectorScreenProps";
import { createOpenTaskInWorkspaceHandler } from "@/components/app/logic/createOpenTaskInWorkspaceHandler";
import type { AppCenterContentValueArgs, UseAppCenterContentValueResult } from "@/components/app/types/appCenterContentValue.types";
import type { AppState } from "@shared/appTypes";

export function deriveAppMainCenterContentValue(
  args: AppCenterContentValueArgs,
  snapshot: AppState
): UseAppCenterContentValueResult {
  const taskPanelProps = args.taskEditorState
    ? {
        title: args.taskEditorState.title,
        projectName: args.taskEditorState.projectName,
        path: args.taskEditorState.path,
        completed: args.taskEditorState.completed,
        updatedAt: args.taskEditorState.updatedAt,
        boardSectionTitle: args.taskEditorState.boardSectionTitle,
        assignedAgents: args.taskEditorState.assignedAgents,
        content: args.taskEditorState.content,
        savedContent: args.taskEditorState.savedContent,
        isCreating: args.taskEditorState.isCreating,
        isLoading: args.taskEditorState.isLoading,
        isSaving: args.taskEditorState.isSaving,
        errorMessage: args.taskEditorState.errorMessage,
        resolvedTheme: args.resolvedTheme,
        tools: snapshot.agentCatalog,
        onChange: (value: string) =>
          args.setTaskEditorState((current) =>
            current
              ? {
                  ...current,
                  content: value
                }
              : current
          ),
        onSave: () => {
          void args.saveTaskEditor();
        },
        onRevert: () =>
          args.setTaskEditorState((current) =>
            current
              ? {
                  ...current,
                  content: current.savedContent,
                  errorMessage: null
                }
              : current
          ),
        onClose: () => args.setTaskEditorState(null),
        onSpawnAgent: (toolId: string) => {
          void args.handleSpawnTaskAgent(toolId);
        },
        onDuplicateToNew: () => {
          void args.duplicateTaskToNew();
        }
      }
    : null;

  const taskCenterProps = {
    workspaceTasks: args.workspaceTasks,
    workspaceSpecs: args.workspaceSpecs,
    workspaceTaskBoards: args.workspaceTaskBoards,
    updateWorkspaceTaskBoard: args.updateWorkspaceTaskBoard,
    tools: snapshot.agentCatalog,
    onOpenTask: createOpenTaskInWorkspaceHandler({
      focusWorkspaceWithRecovery: args.focusWorkspaceWithRecovery,
      openTaskEditor: args.openTaskEditor,
      activeProjectId: snapshot.project?.id ?? null
    }),
    onCreateTask: (projectId: string) => {
      void args.createWorkspaceTask(projectId);
    },
    onGenerateTasks: (projectId: string, toolId: string, brief: string | null, specPath: string | null) =>
      args.generateWorkspaceTasksWithAgent(projectId, toolId, brief, specPath),
    onToggleTaskComplete: args.handleToggleTaskComplete,
    onDeleteTask: args.handleDeleteTask,
    onSpawnAgentsForTasks: args.handleSpawnAgentsForTasks,
    generateTasksRequest: args.generateTasksRequest,
    onClose: () => {
      args.setGenerateTasksRequest(null);
      args.setIsTaskBoardOpen(false);
    }
  };

  const specCenterProps = {
    workspaceSpecs: args.workspaceSpecs,
    isCreatingSpec: args.isCreatingSpec,
    onOpenSpec: (projectId: string, pathName: string) => {
      void args.openWorkspaceSpec(projectId, pathName);
    },
    onCreateSpec: (projectId: string) => {
      void args.createWorkspaceSpec(projectId);
    },
    onDeleteSpec: args.handleDeleteSpec,
    onGenerateTasksFromSpec: (projectId: string, pathName: string) => {
      args.setGenerateTasksRequest({
        projectId,
        specPath: pathName,
        nonce: Date.now()
      });
      args.setIsSpecBrowserOpen(false);
      args.setIsTaskBoardOpen(true);
    },
    onClose: () => args.setIsSpecBrowserOpen(false)
  };

  const noteCenterProps = {
    workspaceNotes: args.workspaceNotes,
    isCreatingNote: args.isCreatingNote,
    onOpenNote: (projectId: string, pathName: string) => {
      void args.openWorkspaceNote(projectId, pathName);
    },
    onCreateNote: (projectId: string) => {
      void args.createWorkspaceNote(projectId);
    },
    onDeleteNote: args.handleDeleteNote,
    onClose: () => args.setIsNoteBrowserOpen(false)
  };

  const projectSelectorScreenProps = buildProjectSelectorScreenProps({
    installCommandDrafts: args.uiState.installCommandDrafts,
    openAddWorkspaceModal: args.openAddWorkspaceModal,
    resolveInstallCommand: args.resolveInstallCommand,
    safely: args.safely,
    setInstallCommandDraft: args.uiCommands.setInstallCommandDraft
  }, snapshot);

  const workspaceSessionPanelProps = createWorkspaceSessionPanelValue({
    activeGridColumns: args.activeGridColumns,
    activeGridRows: args.activeGridRows,
    activeView: args.activeView,
    activeWorkspaceContentTab: args.activeWorkspaceContentTab,
    addForgeWorkItemComment: args.addForgeWorkItemComment,
    agent: args.focusedAgent,
    aiChatTab: args.focusedAiChatTab,
    aiChatTabs: args.uiState.aiChatTabs,
    aiModelLoading: args.aiModelLoading,
    aiModelOptions: args.aiModelOptions,
    appSettings: args.appSettings,
    aiSettings: args.appSettings.ai,
    browserTab: args.focusedBrowserTab,
    browserTabs: args.uiState.browserTabs,
    closeAiChatTab: args.closeAiChatTab,
    closeBrowserTab: args.closeBrowserTab,
    closeForgeViewerTab: args.closeForgeViewerTab,
    createTerminalWithStatus: args.createTerminalWithStatus,
    createWorkspaceSpec: args.createWorkspaceSpec,
    createWorkspaceTask: args.createWorkspaceTask,
    fileEditorState: args.fileEditorState,
    focusAiChatTab: args.focusAiChatTab,
    focusBrowserTab: args.focusBrowserTab,
    focusForgeViewerTab: args.focusForgeViewerTab,
    focusWorkspaceWithRecovery: args.focusWorkspaceWithRecovery,
    forgeActionLoading: args.isPerformingForgeWorkItemAction,
    forgeCommentLoading: args.isPostingForgeWorkItemComment,
    forgeDetail: args.forgeWorkItemDetail,
    forgeDetailErrorMessage: args.forgeWorkItemDetailErrorMessage,
    forgeDetailLoading: args.isLoadingForgeWorkItemDetail,
    forgeOverview: args.forgeOverview,
    forgeViewerTab: args.focusedForgeViewerTab,
    forgeViewerTabs: args.uiState.forgeViewerTabs,
    handleOpenWorkspaceBrowser: args.handleOpenWorkspaceBrowser,
    handleSelectAiChatProviderModel: args.handleSelectAiChatProviderModel,
    handleSpawnForgeIssueAgent: args.handleSpawnForgeIssueAgent,
    handleSpawnForgeReviewAgent: args.handleSpawnForgeReviewAgent,
    isDiffExpanded: args.isCenterDiffExpanded,
    isFullDiffExpanded: args.isCenterFullDiffExpanded,
    loadForgeWorkItemDetail: args.loadForgeWorkItemDetail,
    openAddWorkspaceModal: args.openAddWorkspaceModal,
    openAiChat: args.openAiChat,
    openFileEditor: args.openFileEditor,
    openForgeViewer: args.openForgeViewer,
    openSettingsPage: args.openSettingsPage,
    performForgeWorkItemAction: args.performForgeWorkItemAction,
    platform: args.windowUiStatePlatform,
    project: snapshot.project,
    projectScripts: snapshot.projectScripts,
    refreshForgeOverview: args.refreshForgeOverview,
    resolvedTheme: args.resolvedTheme,
    resolveGitlabForgeRepoOverride: args.resolveGitlabForgeRepoOverride,
    safely: args.safely,
    saveFileEditor: args.saveFileEditor,
    selectedDiffChange: args.selectedChange,
    setActiveWorkspaceContentTab: args.setActiveWorkspaceContentTab,
    setFileEditorState: args.setFileEditorState,
    setGenerateTasksRequest: args.setGenerateTasksRequest,
    setIsCenterDiffExpanded: args.setIsCenterDiffExpanded,
    setIsCenterFullDiffExpanded: args.setIsCenterFullDiffExpanded,
    setIsNoteBrowserOpen: args.setIsNoteBrowserOpen,
    setIsSpecBrowserOpen: args.setIsSpecBrowserOpen,
    setIsTaskBoardOpen: args.setIsTaskBoardOpen,
    setTaskEditorState: args.setTaskEditorState,
    uiCommands: args.uiCommands,
    showSessionTabs: args.appSettings.showWorkspaceSessionTabs,
    splitViewCollection: args.activeSplitViewCollection,
    splitViews: args.activeSplitViewCollection.views,
    splitViewsErrorMessage: args.splitViewsErrorMessage,
    splitViewsLoading: args.splitViewsLoading,
    terminal: args.focusedTerminal,
    terminalFontId: args.terminalFontId,
    terminalQuickLaunchDefaults: args.appSettings.terminalQuickLaunchDefaults,
    terminalShells: snapshot.terminalShells,
    terminalThemeId: args.terminalThemeId,
    tools: snapshot.agentCatalog,
    updateAiChatTabMessages: args.updateAiChatTabMessages,
    updateAiChatTabReasoningMode: args.updateAiChatTabReasoningMode,
    updateAiChatTabTitle: args.updateAiChatTabTitle,
    updateBrowserTab: args.updateBrowserTab,
    workspace: args.focusedWorkspace,
    workspaceSessionViews: args.workspaceSessionViews
  });

  return {
    taskPanelProps,
    isTaskBoardOpen: args.isTaskBoardOpen,
    taskCenterProps,
    isSpecBrowserOpen: args.isSpecBrowserOpen,
    specCenterProps,
    isNoteBrowserOpen: args.isNoteBrowserOpen,
    noteCenterProps,
    shouldShowProjectSelectorScreen: args.shouldShowProjectSelectorScreen,
    projectSelectorScreenProps,
    workspaceSessionPanelProps
  };
}
