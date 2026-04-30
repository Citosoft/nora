import { noraSessionClient } from "@/components/app/clients/noraSessionClient";
import { noraToolingManagementClient } from "@/components/app/clients/noraToolingManagementClient";
import {
  buildCloseDirtyFileEditorTabMessage,
  closeFileEditorTab,
  findFileEditorTab
} from "@/components/app/logic/fileEditorTabs";
import { buildDestroyTerminalGuardMessage } from "@/components/app/logic/sessionCloseGuard";
import type { WorkspaceSessionPanelProps } from "@/components/app/types/panel.types";
import type { WorkspaceSessionPanelBuildDeps } from "@/components/app/types/workspaceSessionPanelBuild.types";
import { createContext, useContext, type ReactNode } from "react";

export const createWorkspaceSessionPanelValue = (d: WorkspaceSessionPanelBuildDeps): WorkspaceSessionPanelProps => ({
  project: d.project,
  workspace: d.workspace,
  agent: d.agent,
  terminal: d.terminal,
  browserTab: d.browserTab,
  browserTabs: d.browserTabs,
  aiChatTab: d.aiChatTab,
  aiChatTabs: d.aiChatTabs,
  aiSettings: d.aiSettings,
  aiModelOptions: d.aiModelOptions,
  aiModelLoading: d.aiModelLoading,
  onSelectAiChatProviderModel: d.handleSelectAiChatProviderModel,
  onOpenAiSettings: () => d.openSettingsPage("ai"),
  onUpdateAiChatTabTitle: d.updateAiChatTabTitle,
  forgeViewerTab: d.forgeViewerTab,
  forgeViewerTabs: d.forgeViewerTabs,
  fileEditorState: d.fileEditorState,
  isDiffExpanded: d.isDiffExpanded,
  selectedDiffChange: d.selectedDiffChange,
  splitViewCollection: d.splitViewCollection,
  splitViews: d.splitViews,
  splitViewsLoading: d.splitViewsLoading,
  splitViewsErrorMessage: d.splitViewsErrorMessage,
  forgeOverview: d.forgeOverview,
  forgeDetail: d.forgeDetail,
  forgeDetailLoading: d.forgeDetailLoading,
  forgeDetailErrorMessage: d.forgeDetailErrorMessage,
  forgeActionLoading: d.forgeActionLoading,
  forgeCommentLoading: d.forgeCommentLoading,
  tools: d.tools,
  projectScripts: d.projectScripts,
  terminalShells: d.terminalShells,
  terminalQuickLaunchDefaults: d.terminalQuickLaunchDefaults,
  appSettings: d.appSettings,
  platform: d.platform,
  resolvedTheme: d.resolvedTheme,
  terminalThemeId: d.terminalThemeId,
  terminalFontId: d.terminalFontId,
  showSessionTabs: d.showSessionTabs,
  activeView: d.activeView,
  activeWorkspaceContentTab: d.activeWorkspaceContentTab,
  activeGridColumns: d.activeGridColumns,
  activeGridRows: d.activeGridRows,
  addFocusedLabel: d.addFocusedLabel,
  canAddCurrentItem: d.canAddCurrentItem,
  onChooseProject: d.openAddWorkspaceModal,
  onRefreshCatalog: () => d.safely(() => noraToolingManagementClient.refreshToolCatalog()),
  onCreateInWorkspace: (defaults) => d.uiCommands.openCreateAgentDialog(defaults),
  onLaunchTerminalFromDefaults: (payload) => {
    void d.createTerminalWithStatus(payload);
  },
  onOpenCreateTerminal: (defaults) => d.uiCommands.openCreateTerminalDialog(defaults),
  onOpenWorkspaceTerminalPresets: (projectId) => d.uiCommands.openWorkspaceTerminalPresetsDialog(projectId),
  onOpenWorkspaceBrowser: d.handleOpenWorkspaceBrowser,
  onOpenAiChat: d.openAiChat,
  onOpenWorkspaceSwitcher: d.uiCommands.openWorkspaceSwitcherDialog,
  onOpenTaskBoard: () => {
    d.setActiveWorkspaceContentTab(null);
    d.setIsSpecBrowserOpen(false);
    d.setIsNoteBrowserOpen(false);
    d.setTaskEditorState(null);
    d.setIsTaskBoardOpen(true);
  },
  onOpenSpecBrowser: () => {
    d.setActiveWorkspaceContentTab(null);
    d.setIsTaskBoardOpen(false);
    d.setIsNoteBrowserOpen(false);
    d.setTaskEditorState(null);
    d.setIsSpecBrowserOpen(true);
  },
  onOpenNoteBrowser: () => {
    d.setActiveWorkspaceContentTab(null);
    d.setIsTaskBoardOpen(false);
    d.setIsSpecBrowserOpen(false);
    d.setTaskEditorState(null);
    d.setIsNoteBrowserOpen(true);
  },
  onGenerateTasksFromSpec: (projectId, pathName) => {
    d.setGenerateTasksRequest({
      projectId,
      specPath: pathName,
      nonce: Date.now()
    });
    d.setActiveWorkspaceContentTab(null);
    d.setIsSpecBrowserOpen(false);
    d.setIsNoteBrowserOpen(false);
    d.setTaskEditorState(null);
    d.setIsTaskBoardOpen(true);
  },
  onCreateWorkspaceTaskFromSelection: async (projectId, selectionText) => {
    if (d.project?.id !== projectId) {
      const next = await d.focusWorkspaceWithRecovery(projectId);
      if (!next) {
        return;
      }
    }
    await d.createWorkspaceTask(projectId, {
      contextText: selectionText
    });
  },
  onCreateWorkspaceSpecFromSelection: async (projectId, selectionText) => {
    if (d.project?.id !== projectId) {
      const next = await d.focusWorkspaceWithRecovery(projectId);
      if (!next) {
        return;
      }
    }
    await d.createWorkspaceSpec(projectId, { contextText: selectionText });
  },
  onFocusView: (viewId) => {
    d.setIsTaskBoardOpen(false);
    d.setTaskEditorState(null);
    d.uiCommands.clearSessionTabFocus();
    d.workspaceSessionViews.setActiveViewId(viewId);
  },
  onFocusBrowserTab: d.focusBrowserTab,
  onCloseBrowserTab: d.closeBrowserTab,
  onUpdateBrowserTab: d.updateBrowserTab,
  onFocusAiChatTab: d.focusAiChatTab,
  onCloseAiChatTab: d.closeAiChatTab,
  onUpdateAiChatTabMessages: d.updateAiChatTabMessages,
  onUpdateAiChatTabReasoningMode: d.updateAiChatTabReasoningMode,
  onFocusForgeViewerTab: d.focusForgeViewerTab,
  onCloseForgeViewerTab: d.closeForgeViewerTab,
  onFocusFileEditorTab: (pathName) => {
    d.setActiveWorkspaceContentTab("file");
    d.setFileEditorState((current) =>
      current?.tabs.some((tab) => tab.path === pathName) ? { ...current, activePath: pathName } : current
    );
  },
  onCloseFileEditorTab: (pathName) => {
    const closingTab = findFileEditorTab(d.fileEditorState, pathName);
    const confirmMessage = closingTab ? buildCloseDirtyFileEditorTabMessage(closingTab) : null;
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    const nextFileEditorState = closeFileEditorTab(d.fileEditorState, pathName);
    d.setFileEditorState((current) => closeFileEditorTab(current, pathName));
    d.setActiveWorkspaceContentTab((current) =>
      current === "file"
        ? ((nextFileEditorState?.tabs.length ?? 0) > 0 ? "file" : (d.isDiffExpanded ? "diff" : null))
        : current
    );
  },
  onSetActiveWorkspaceContentTab: d.setActiveWorkspaceContentTab,
  onChangeActiveFileEditorContent: (value) =>
    d.setFileEditorState((current) =>
      current
        ? {
            ...current,
            tabs: current.tabs.map((tab) =>
              tab.path === current.activePath ? { ...tab, content: value } : tab
            )
          }
        : current
    ),
  onSaveActiveFileEditor: () => {
    void d.saveFileEditor();
  },
  onRevertActiveFileEditor: () =>
    d.setFileEditorState((current) =>
      current
        ? {
            ...current,
            tabs: current.tabs.map((tab) =>
              tab.path === current.activePath
                ? {
                    ...tab,
                    content: tab.savedContent,
                    errorMessage: null
                  }
                : tab
            )
          }
        : current
    ),
  onCloseExpandedDiff: () => {
    d.setIsCenterDiffExpanded(false);
    d.setActiveWorkspaceContentTab((d.fileEditorState?.tabs.length ?? 0) > 0 ? "file" : null);
  },
  onRestart: (agentId) => d.safely(() => noraSessionClient.restartAgent(agentId)),
  onRestartTerminal: (sessionId) => d.safely(() => noraSessionClient.restartTerminal(sessionId)),
  onClearTerminal: (sessionId) => d.safely(() => noraSessionClient.clearTerminal(sessionId)),
  onDestroyRequest: (agentId) => d.uiCommands.setDestroyAgentId(agentId),
  onDestroyTerminal: (sessionId) => {
    const terminal = d.workspace?.terminals.find((item) => item.id === sessionId) ?? null;
    const confirmMessage = terminal ? buildDestroyTerminalGuardMessage(terminal, Date.now()) : null;
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return Promise.resolve(null);
    }

    return d.safely(() => noraSessionClient.destroyTerminal(sessionId));
  },
  onDeleteViewById: (viewId) => d.workspaceSessionViews.deleteViewById(viewId),
  onExitSplitView: () => d.workspaceSessionViews.setActiveViewId(null),
  onGridPresetChange: (gridColumns, gridRows) => {
    void d.workspaceSessionViews.setGridPreset(gridColumns, gridRows);
  },
  onAddFocused: () => {
    void d.workspaceSessionViews.addFocusedItem();
  },
  onRenameActiveView: (name) => {
    void d.workspaceSessionViews.renameActiveView(name);
  },
  onDeleteActiveView: () => {
    void d.workspaceSessionViews.deleteActiveView();
  },
  onFocusAgent: (agentId) => {
    d.setIsTaskBoardOpen(false);
    d.setTaskEditorState(null);
    d.uiCommands.clearSessionTabFocus();
    void d.safely(() => noraSessionClient.focusAgent(agentId));
  },
  onFocusTerminal: (sessionId) => {
    d.setIsTaskBoardOpen(false);
    d.setTaskEditorState(null);
    d.uiCommands.clearSessionTabFocus();
    void d.safely(() => noraSessionClient.focusTerminal(sessionId));
  },
  onRefreshForge: d.refreshForgeOverview,
  onOpenForgeUrl: (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  },
  onOpenForgeItem: (kind, item) => {
    if (!d.project?.id) {
      return;
    }
    const repoOverride = d.resolveGitlabForgeRepoOverride(item);
    d.openForgeViewer(d.project.id, kind, item.number, item.title, repoOverride);
  },
  onRefreshForgeItem: () => {
    if (!d.forgeViewerTab) {
      return;
    }
    const repoOverride =
      d.forgeViewerTab.forgeRepoHostOverride && d.forgeViewerTab.forgeRepoFullNameOverride
        ? {
            host: d.forgeViewerTab.forgeRepoHostOverride,
            fullName: d.forgeViewerTab.forgeRepoFullNameOverride
          }
        : null;
    void d.loadForgeWorkItemDetail(d.forgeViewerTab.kind, d.forgeViewerTab.number, repoOverride);
  },
  onForgeAction: (action) => {
    void d.performForgeWorkItemAction(action);
  },
  onForgeCommentSubmit: async (payload) => {
    await d.addForgeWorkItemComment(payload);
  },
  onSpawnIssueAgent: async (toolId) => {
    await d.handleSpawnForgeIssueAgent(toolId);
  },
  onAddItemToSlot: (item, column, row) => {
    void d.workspaceSessionViews.addItemToSlot(item, column, row);
  },
  onMoveTile: (tileId, deltaColumn, deltaRow) => {
    void d.workspaceSessionViews.moveTile(tileId, deltaColumn, deltaRow);
  },
  onMoveTileToPosition: (tileId, column, row) => {
    void d.workspaceSessionViews.moveTileToPosition(tileId, column, row);
  },
  onSwapTiles: (sourceTileId, targetTileId) => {
    void d.workspaceSessionViews.swapTiles(sourceTileId, targetTileId);
  },
  onRemoveTile: (tileId) => {
    void d.workspaceSessionViews.removeTile(tileId);
  }
});

type WorkspaceSessionPanelData = Pick<
  WorkspaceSessionPanelProps,
  | "project"
  | "workspace"
  | "agent"
  | "terminal"
  | "browserTab"
  | "browserTabs"
  | "aiChatTab"
  | "aiChatTabs"
  | "aiSettings"
  | "aiModelOptions"
  | "aiModelLoading"
  | "forgeViewerTab"
  | "forgeViewerTabs"
  | "fileEditorState"
  | "isDiffExpanded"
  | "selectedDiffChange"
  | "splitViewCollection"
  | "splitViews"
  | "splitViewsLoading"
  | "splitViewsErrorMessage"
  | "forgeOverview"
  | "forgeDetail"
  | "forgeDetailLoading"
  | "forgeDetailErrorMessage"
  | "forgeActionLoading"
  | "forgeCommentLoading"
  | "tools"
  | "projectScripts"
  | "terminalShells"
  | "terminalQuickLaunchDefaults"
  | "appSettings"
  | "platform"
  | "resolvedTheme"
  | "terminalThemeId"
  | "terminalFontId"
  | "showSessionTabs"
  | "activeView"
  | "activeWorkspaceContentTab"
  | "activeGridColumns"
  | "activeGridRows"
  | "addFocusedLabel"
  | "canAddCurrentItem"
>;

type WorkspaceSessionPanelActions = Omit<WorkspaceSessionPanelProps, keyof WorkspaceSessionPanelData>;

const WorkspaceSessionPanelDataContext = createContext<WorkspaceSessionPanelData | null>(null);
const WorkspaceSessionPanelActionsContext = createContext<WorkspaceSessionPanelActions | null>(null);

export function WorkspaceSessionPanelProvider({
  value,
  children
}: {
  value: WorkspaceSessionPanelProps;
  children: ReactNode;
}) {
  const dataValue: WorkspaceSessionPanelData = {
    project: value.project,
    workspace: value.workspace,
    agent: value.agent,
    terminal: value.terminal,
    browserTab: value.browserTab,
    browserTabs: value.browserTabs,
    aiChatTab: value.aiChatTab,
    aiChatTabs: value.aiChatTabs,
    aiSettings: value.aiSettings,
    aiModelOptions: value.aiModelOptions,
    aiModelLoading: value.aiModelLoading,
    forgeViewerTab: value.forgeViewerTab,
    forgeViewerTabs: value.forgeViewerTabs,
    fileEditorState: value.fileEditorState,
    isDiffExpanded: value.isDiffExpanded,
    selectedDiffChange: value.selectedDiffChange,
    splitViewCollection: value.splitViewCollection,
    splitViews: value.splitViews,
    splitViewsLoading: value.splitViewsLoading,
    splitViewsErrorMessage: value.splitViewsErrorMessage,
    forgeOverview: value.forgeOverview,
    forgeDetail: value.forgeDetail,
    forgeDetailLoading: value.forgeDetailLoading,
    forgeDetailErrorMessage: value.forgeDetailErrorMessage,
    forgeActionLoading: value.forgeActionLoading,
    forgeCommentLoading: value.forgeCommentLoading,
    tools: value.tools,
    projectScripts: value.projectScripts,
    terminalShells: value.terminalShells,
    terminalQuickLaunchDefaults: value.terminalQuickLaunchDefaults,
    appSettings: value.appSettings,
    platform: value.platform,
    resolvedTheme: value.resolvedTheme,
    terminalThemeId: value.terminalThemeId,
    terminalFontId: value.terminalFontId,
    showSessionTabs: value.showSessionTabs,
    activeView: value.activeView,
    activeWorkspaceContentTab: value.activeWorkspaceContentTab,
    activeGridColumns: value.activeGridColumns,
    activeGridRows: value.activeGridRows,
    addFocusedLabel: value.addFocusedLabel,
    canAddCurrentItem: value.canAddCurrentItem
  };
  const actionsValue: WorkspaceSessionPanelActions = {
    onChooseProject: value.onChooseProject,
    onRefreshCatalog: value.onRefreshCatalog,
    onCreateInWorkspace: value.onCreateInWorkspace,
    onLaunchTerminalFromDefaults: value.onLaunchTerminalFromDefaults,
    onOpenCreateTerminal: value.onOpenCreateTerminal,
    onOpenWorkspaceTerminalPresets: value.onOpenWorkspaceTerminalPresets,
    onOpenWorkspaceBrowser: value.onOpenWorkspaceBrowser,
    onOpenWorkspaceSwitcher: value.onOpenWorkspaceSwitcher,
    onOpenTaskBoard: value.onOpenTaskBoard,
    onOpenSpecBrowser: value.onOpenSpecBrowser,
    onOpenNoteBrowser: value.onOpenNoteBrowser,
    onGenerateTasksFromSpec: value.onGenerateTasksFromSpec,
    onCreateWorkspaceTaskFromSelection: value.onCreateWorkspaceTaskFromSelection,
    onCreateWorkspaceSpecFromSelection: value.onCreateWorkspaceSpecFromSelection,
    onFocusView: value.onFocusView,
    onFocusBrowserTab: value.onFocusBrowserTab,
    onCloseBrowserTab: value.onCloseBrowserTab,
    onUpdateBrowserTab: value.onUpdateBrowserTab,
    onOpenAiChat: value.onOpenAiChat,
    onSelectAiChatProviderModel: value.onSelectAiChatProviderModel,
    onOpenAiSettings: value.onOpenAiSettings,
    onFocusAiChatTab: value.onFocusAiChatTab,
    onCloseAiChatTab: value.onCloseAiChatTab,
    onUpdateAiChatTabMessages: value.onUpdateAiChatTabMessages,
    onUpdateAiChatTabReasoningMode: value.onUpdateAiChatTabReasoningMode,
    onUpdateAiChatTabTitle: value.onUpdateAiChatTabTitle,
    onFocusForgeViewerTab: value.onFocusForgeViewerTab,
    onCloseForgeViewerTab: value.onCloseForgeViewerTab,
    onFocusFileEditorTab: value.onFocusFileEditorTab,
    onCloseFileEditorTab: value.onCloseFileEditorTab,
    onSetActiveWorkspaceContentTab: value.onSetActiveWorkspaceContentTab,
    onChangeActiveFileEditorContent: value.onChangeActiveFileEditorContent,
    onSaveActiveFileEditor: value.onSaveActiveFileEditor,
    onRevertActiveFileEditor: value.onRevertActiveFileEditor,
    onCloseExpandedDiff: value.onCloseExpandedDiff,
    onRestart: value.onRestart,
    onRestartTerminal: value.onRestartTerminal,
    onClearTerminal: value.onClearTerminal,
    onDestroyRequest: value.onDestroyRequest,
    onDestroyTerminal: value.onDestroyTerminal,
    onDeleteViewById: value.onDeleteViewById,
    onExitSplitView: value.onExitSplitView,
    onFocusAgent: value.onFocusAgent,
    onFocusTerminal: value.onFocusTerminal,
    onGridPresetChange: value.onGridPresetChange,
    onAddFocused: value.onAddFocused,
    onRenameActiveView: value.onRenameActiveView,
    onDeleteActiveView: value.onDeleteActiveView,
    onRefreshForge: value.onRefreshForge,
    onOpenForgeUrl: value.onOpenForgeUrl,
    onOpenForgeItem: value.onOpenForgeItem,
    onRefreshForgeItem: value.onRefreshForgeItem,
    onForgeAction: value.onForgeAction,
    onForgeCommentSubmit: value.onForgeCommentSubmit,
    onSpawnIssueAgent: value.onSpawnIssueAgent,
    onAddItemToSlot: value.onAddItemToSlot,
    onMoveTile: value.onMoveTile,
    onMoveTileToPosition: value.onMoveTileToPosition,
    onSwapTiles: value.onSwapTiles,
    onRemoveTile: value.onRemoveTile
  };

  return (
    <WorkspaceSessionPanelDataContext.Provider value={dataValue}>
      <WorkspaceSessionPanelActionsContext.Provider value={actionsValue}>
        {children}
      </WorkspaceSessionPanelActionsContext.Provider>
    </WorkspaceSessionPanelDataContext.Provider>
  );
}

function useSessionSlice<T>(context: React.Context<T | null>, label: string): T {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${label} must be used within a WorkspaceSessionPanelProvider.`);
  }
  return value;
}

export function useWorkspaceSessionPanelData(): WorkspaceSessionPanelData {
  return useSessionSlice(WorkspaceSessionPanelDataContext, "useWorkspaceSessionPanelData");
}

export function useWorkspaceSessionPanelActions(): WorkspaceSessionPanelActions {
  return useSessionSlice(WorkspaceSessionPanelActionsContext, "useWorkspaceSessionPanelActions");
}

export function useWorkspaceSessionPanelContext(): WorkspaceSessionPanelProps {
  return {
    ...useWorkspaceSessionPanelData(),
    ...useWorkspaceSessionPanelActions()
  };
}
