import { noraSessionClient } from "@/components/app/clients/noraSessionClient";
import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { noraToolingManagementClient } from "@/components/app/clients/noraToolingManagementClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { noraWorkspaceManagementClient } from "@/components/app/clients/noraWorkspaceManagementClient";
import { createOpenTaskInWorkspaceHandler } from "@/components/app/logic/createOpenTaskInWorkspaceHandler";
import { createQuickTerminalDialogDefaults, createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import { createWorkspaceTerminalNavigation } from "@/components/app/logic/workspaceTerminalNavigation";
import type { WorkspaceSidebarProps } from "@/components/app/types/component.types";
import type { CreateTerminalPayload } from "@shared/appTypes";
import type { WorkspaceSidebarBuildDeps } from "@/components/app/types/workspaceSidebarBuild.types";
import { createContext, useContext, type ReactNode } from "react";

export const createWorkspaceSidebarValue = (d: WorkspaceSidebarBuildDeps): WorkspaceSidebarProps => {
  const onOpenTask = createOpenTaskInWorkspaceHandler({
    focusWorkspaceWithRecovery: d.focusWorkspaceWithRecovery,
    openTaskEditor: d.openTaskEditor,
    activeProjectId: d.activeProjectId
  });
  const terminalNavigation = createWorkspaceTerminalNavigation(d);
  const runInWorkspace = (projectId: string, action: () => void) => {
    if (d.activeProjectId === projectId) {
      action();
      return;
    }
    void d.focusWorkspaceWithRecovery(projectId).then((next) => {
      if (!next) {
        return;
      }
      action();
    });
  };

  return {
    githubToken: d.githubToken,
    gitlabToken: d.gitlabToken,
    gitlabHost: d.gitlabHost,
    terminalPresets: d.terminalPresets,
    terminalQuickLaunchDefaults: d.terminalQuickLaunchDefaults,
    agentsNeedingAttention: d.agentsNeedingAttention,
    focusedWorkspace: d.focusedWorkspace,
    focusedAgent: d.focusedAgent,
    focusedTerminal: d.focusedTerminal,
    removingWorkspaceRoots: d.removingWorkspaceRoots,
    collapsed: d.isWorkspaceSidebarCollapsed,
    collapsedWorkspaceIds: d.collapsedWorkspaceIds,
    isCliSectionCollapsed: d.isCliSectionCollapsed,
    workspaceTasks: d.workspaceTasks,
    workspaceSpecs: d.workspaceSpecs,
    workspaceNotes: d.workspaceNotes,
    aiChatTabs: d.workspaceSidebarUiState.aiChatTabs,
    focusedAiChatTabId: d.workspaceSidebarUiState.focusedAiChatTabId,
    focusedBrowserTabId: d.workspaceSidebarUiState.focusedBrowserTabId,
    focusedForgeViewerTabId: d.workspaceSidebarUiState.focusedForgeViewerTabId,
    activeWorkspaceContentTab: d.activeWorkspaceContentTab,
    isTaskBoardOpen: d.isTaskBoardOpen,
    isSpecBrowserOpen: d.isSpecBrowserOpen,
    isNoteBrowserOpen: d.isNoteBrowserOpen,
    installCommandDrafts: d.workspaceSidebarUiState.installCommandDrafts,
    onChooseProject: () => {
      void d.openAddWorkspaceModal();
    },
    onCloseProject: () => d.safely(() => noraWorkspaceManagementClient.closeWorkspace()),
    onRemoveProject: (projectRoot) => {
      void d.handleRemoveWorkspace(projectRoot);
    },
    onRefresh: () => d.safely(() => noraWorkspaceManagementClient.refreshWorkspace()),
    onRefreshCatalog: () => d.safely(() => noraToolingManagementClient.refreshToolCatalog()),
    onResetWorkspaces: d.uiCommands.openResetWorkspacesDialog,
    onOpenCreateAgent: (defaults) => d.uiCommands.openCreateAgentDialog(defaults),
    onOpenCreateTerminal: (defaults) => d.uiCommands.openCreateTerminalDialog(defaults),
    onResumeThread: async (projectId, payload) => {
      const focused = await d.focusWorkspaceWithRecovery(projectId);
      if (!focused) {
        return;
      }
      await d.safely(() => noraSessionClient.createAgent(payload));
    },
    onArchiveThread: async (projectId, ref) => {
      await noraWorkspaceClient.archiveExternalHarnessThread({ projectId, ref });
    },
    onLaunchWorkspaceTerminal: (projectId, payload) => {
      void d.launchTerminalInWorkspace(projectId, payload);
    },
    onLaunchWorkspaceScript: (projectId, defaults) => {
      void d.focusWorkspaceWithRecovery(projectId).then((next) => {
        if (!next) {
          return;
        }
        d.uiCommands.openCreateTerminalDialog(defaults);
      });
    },
    onOpenWorkspaceTerminalPresets: (projectId) => d.uiCommands.openWorkspaceTerminalPresetsDialog(projectId),
    onOpenWorkspaceBrowser: terminalNavigation.openWorkspaceBrowser,
    onFocusWorkspace: (projectId) => {
      void d.focusWorkspaceWithRecovery(projectId);
    },
    onFocusWorkspaceView: (worktreeId) => {
      d.setIsTaskBoardOpen(false);
      d.setIsSpecBrowserOpen(false);
      d.setIsNoteBrowserOpen(false);
      d.setTaskEditorState(null);
      d.setWorkspaceSessionActiveViewId(null);
      void d.safely(() => noraSessionClient.focusWorktree(worktreeId));
    },
    onFocusWorkspaceWorktree: (projectId, worktreeId) =>
      d.focusWorkspaceWithRecovery(projectId).then((next) =>
        next
          ? (d.setIsTaskBoardOpen(false),
            d.setIsSpecBrowserOpen(false),
            d.setIsNoteBrowserOpen(false),
            d.setTaskEditorState(null),
            d.setWorkspaceSessionActiveViewId(null),
            d.safely(() => noraSessionClient.focusWorktree(worktreeId)))
          : null
      ),
    onOpenWorkflowRunChangeRequest: async (projectId, worktreeId) => {
      const focused = await d.focusWorkspaceWithRecovery(projectId);
      if (!focused) {
        throw new Error("Unable to focus the workflow project.");
      }
      const next = await d.safely(() => noraSessionClient.focusWorktree(worktreeId));
      if (!next) {
        throw new Error("Unable to focus the workflow worktree.");
      }
      d.setIsTaskBoardOpen(false);
      d.setIsSpecBrowserOpen(false);
      d.setIsNoteBrowserOpen(false);
      d.setTaskEditorState(null);
      d.setWorkspaceSessionActiveViewId(null);
      d.uiCommands.clearBrowserAndForgeFocus();
      const overview = await noraIntegrationClient.getForgeOverview(projectId, {
        githubToken: d.githubToken,
        gitlabToken: d.gitlabToken,
        gitlabHost: d.gitlabHost
      });
      if (!overview.repo) {
        throw new Error(overview.errorMessage ?? "Connect this repository to GitHub or GitLab before creating a change request.");
      }
      d.setIsCreatePullRequestDialogOpen(true);
    },
    onOpenCreateAgentOnWorktree: (projectId, worktreeId) => {
      runInWorkspace(projectId, () =>
        d.uiCommands.openCreateAgentDialog({
          target: { kind: "existing", worktreeId }
        })
      );
    },
    onOpenCreateTerminalOnWorktree: (projectId, worktreeId) => {
      runInWorkspace(projectId, () =>
        d.uiCommands.openCreateTerminalDialog({
          ...createQuickTerminalDialogDefaults(null, d.terminalQuickLaunchDefaults),
          target: { kind: "existing", worktreeId }
        })
      );
    },
    onOpenCreateWorktree: (projectId) => {
      runInWorkspace(projectId, () =>
        d.uiCommands.openCreateAgentDialog({
          target: { kind: "new" },
          initialWizardStepIndex: 1
        })
      );
    },
    onLaunchQuickTerminalOnWorktree: (projectId, worktreeId) => {
      void d.launchTerminalInWorkspace(projectId, {
        ...createQuickTerminalPayload(null, d.terminalQuickLaunchDefaults),
        target: { kind: "existing", worktreeId }
      });
    },
    onCheckoutWorkspaceBranch: (projectId, branch) =>
      d.activeProjectId === projectId
        ? d.safely(() => noraWorkspaceClient.checkoutWorkspaceBranch({ projectId, branch }))
        : d.focusWorkspaceWithRecovery(projectId).then((next) =>
            next ? d.safely(() => noraWorkspaceClient.checkoutWorkspaceBranch({ projectId, branch })) : null
          ),
    onLaunchWorktreeScript: (projectId, payload: CreateTerminalPayload) => {
      void d.launchTerminalInWorkspace(projectId, payload);
    },
    onRemoveWorktree: (projectId, worktreeId, branch) => {
      const confirmed = window.confirm(
        `Delete worktree "${branch}"? This removes the git worktree and Nora's managed checkout. This cannot be undone.`
      );
      if (!confirmed) {
        return;
      }
      runInWorkspace(projectId, () => {
        void d.safely(() => noraSessionClient.removeWorktree(worktreeId));
      });
    },
    onFocusAgent: (agentId) => {
      d.setIsTaskBoardOpen(false);
      d.setIsSpecBrowserOpen(false);
      d.setIsNoteBrowserOpen(false);
      d.setTaskEditorState(null);
      d.setWorkspaceSessionActiveViewId(null);
      d.uiCommands.clearSessionTabFocus();
      void d.safely(() => noraSessionClient.focusAgent(agentId));
    },
    onFocusTerminal: terminalNavigation.focusTerminal,
    onFocusWorkspaceAgent: (projectId, agentId) =>
      d.focusWorkspaceWithRecovery(projectId).then((next) =>
        next
          ? next.focusedAgentId === agentId
            ? (d.setIsTaskBoardOpen(false),
              d.setIsSpecBrowserOpen(false),
              d.setIsNoteBrowserOpen(false),
              d.setTaskEditorState(null),
              d.setWorkspaceSessionActiveViewId(null),
              d.uiCommands.clearBrowserAndForgeFocus(),
              Promise.resolve(next))
            : (d.setIsTaskBoardOpen(false),
              d.setIsSpecBrowserOpen(false),
              d.setIsNoteBrowserOpen(false),
              d.setTaskEditorState(null),
              d.setWorkspaceSessionActiveViewId(null),
              d.uiCommands.clearBrowserAndForgeFocus(),
              d.safely(() => noraSessionClient.focusAgent(agentId)))
          : null
      ),
    onRestartAgent: (agentId) => d.safely(() => noraSessionClient.restartAgent(agentId)),
    onDestroyAgentRequest: (agentId) => d.uiCommands.setDestroyAgentId(agentId),
    onRenameTerminal: (sessionId, nextName) => d.safely(() => noraSessionClient.renameTerminal(sessionId, nextName)),
    onFocusWorkspaceTerminal: terminalNavigation.focusWorkspaceTerminal,
    onDestroyTerminal: (sessionId) => d.safely(() => noraSessionClient.destroyTerminal(sessionId)),
    onOpenTask,
    onCreateTask: (projectId) => {
      void d.createWorkspaceTask(projectId);
    },
    onOpenSpec: (projectId, pathName) => {
      void d.openWorkspaceSpec(projectId, pathName);
    },
    onCreateSpec: (projectId) => {
      void d.createWorkspaceSpec(projectId);
    },
    onDeleteSpec: (projectId, pathName) => d.handleDeleteSpec(projectId, pathName),
    onGenerateTasksFromSpec: (projectId, pathName) => {
      d.setFileEditorState(null);
      d.setTaskEditorState(null);
      d.setIsCenterDiffExpanded(false);
      d.setIsSpecBrowserOpen(false);
      d.setIsNoteBrowserOpen(false);
      d.setGenerateTasksRequest({
        projectId,
        specPath: pathName,
        nonce: Date.now()
      });
      d.setIsTaskBoardOpen(true);
    },
    onOpenTaskBoard: () => {
      d.setGenerateTasksRequest(null);
      d.setFileEditorState(null);
      d.setTaskEditorState(null);
      d.setIsCenterDiffExpanded(false);
      d.setIsSpecBrowserOpen(false);
      d.setIsNoteBrowserOpen(false);
      d.setIsTaskBoardOpen(true);
    },
    onOpenSpecBrowser: () => {
      d.setGenerateTasksRequest(null);
      d.setFileEditorState(null);
      d.setTaskEditorState(null);
      d.setIsCenterDiffExpanded(false);
      d.setIsTaskBoardOpen(false);
      d.setIsNoteBrowserOpen(false);
      d.setIsSpecBrowserOpen(true);
    },
    onOpenNote: (projectId, pathName) => {
      void d.openWorkspaceNote(projectId, pathName);
    },
    onCreateNote: (projectId) => {
      void d.createWorkspaceNote(projectId);
    },
    onDeleteNote: (projectId, pathName) => d.handleDeleteNote(projectId, pathName),
    onOpenNoteBrowser: () => {
      d.setGenerateTasksRequest(null);
      d.setFileEditorState(null);
      d.setTaskEditorState(null);
      d.setIsCenterDiffExpanded(false);
      d.setIsTaskBoardOpen(false);
      d.setIsSpecBrowserOpen(false);
      d.setIsNoteBrowserOpen(true);
    },
    onOpenAiChatFromSidebar: d.openAiChatFromSidebar,
    onFocusWorkspaceAiChatTab: d.focusWorkspaceAiChatTab,
    isCreatingTask: d.taskEditorState?.isCreating === true,
    isCreatingSpec: d.isCreatingSpec,
    isCreatingNote: d.isCreatingNote,
    onToggleTaskComplete: (projectId, fromPath, toPath) => d.handleToggleTaskComplete(projectId, fromPath, toPath),
    onDeleteTask: (projectId, pathName) => d.handleDeleteTask(projectId, pathName),
    onInstallDraftChange: d.uiCommands.setInstallCommandDraft,
    onInstallTool: (toolId) =>
      d.safely(() => {
        const tool = d.agentCatalog.find((item) => item.id === toolId);
        return noraToolingManagementClient.installManagedTool({
          toolId,
          action: "install",
          installCommand: d.resolveInstallCommand(toolId, tool?.installTemplate ?? "")
        });
      }),
    onRemoveTool: (toolId) =>
      d.safely(() =>
        noraToolingManagementClient.removeManagedTool({
          toolId,
          action: "remove",
          installCommand: d.workspaceSidebarUiState.installCommandDrafts[toolId] ?? ""
        })
      ),
    onCollapsedWorkspaceIdsChange: d.setCollapsedWorkspaceIds,
    onCliSectionCollapsedChange: d.setIsCliSectionCollapsed,
    onOpenCliSettings: () => d.openSettingsPage("cli"),
    onToggleCollapsed: () => d.setIsWorkspaceSidebarCollapsed((current) => !current)
  };
};

type WorkspaceSidebarRuntimeValue = Pick<
  WorkspaceSidebarProps,
  | "githubToken"
  | "gitlabToken"
  | "gitlabHost"
  | "terminalPresets"
  | "terminalQuickLaunchDefaults"
  | "agentsNeedingAttention"
  | "focusedWorkspace"
  | "focusedAgent"
  | "focusedTerminal"
  | "removingWorkspaceRoots"
  | "workspaceTasks"
  | "workspaceSpecs"
  | "workspaceNotes"
  | "aiChatTabs"
  | "focusedAiChatTabId"
  | "focusedBrowserTabId"
  | "focusedForgeViewerTabId"
  | "activeWorkspaceContentTab"
  | "isTaskBoardOpen"
  | "isSpecBrowserOpen"
  | "isNoteBrowserOpen"
  | "installCommandDrafts"
  | "isCreatingTask"
  | "isCreatingSpec"
  | "isCreatingNote"
>;

type WorkspaceSidebarUiValue = Pick<
  WorkspaceSidebarProps,
  | "collapsed"
  | "collapsedWorkspaceIds"
  | "isCliSectionCollapsed"
  | "onCollapsedWorkspaceIdsChange"
  | "onCliSectionCollapsedChange"
  | "onToggleCollapsed"
>;

type WorkspaceSidebarActionsValue = Omit<WorkspaceSidebarProps, keyof WorkspaceSidebarRuntimeValue | keyof WorkspaceSidebarUiValue>;

const WorkspaceSidebarRuntimeContext = createContext<WorkspaceSidebarRuntimeValue | null>(null);
const WorkspaceSidebarUiContext = createContext<WorkspaceSidebarUiValue | null>(null);
const WorkspaceSidebarActionsContext = createContext<WorkspaceSidebarActionsValue | null>(null);

export function WorkspaceSidebarProvider({
  value,
  children
}: {
  value: WorkspaceSidebarProps;
  children: ReactNode;
}) {
  const runtimeValue: WorkspaceSidebarRuntimeValue = {
    githubToken: value.githubToken,
    gitlabToken: value.gitlabToken,
    gitlabHost: value.gitlabHost,
    terminalPresets: value.terminalPresets,
    terminalQuickLaunchDefaults: value.terminalQuickLaunchDefaults,
    agentsNeedingAttention: value.agentsNeedingAttention,
    focusedWorkspace: value.focusedWorkspace,
    focusedAgent: value.focusedAgent,
    focusedTerminal: value.focusedTerminal,
    removingWorkspaceRoots: value.removingWorkspaceRoots,
    workspaceTasks: value.workspaceTasks,
    workspaceSpecs: value.workspaceSpecs,
    workspaceNotes: value.workspaceNotes,
    aiChatTabs: value.aiChatTabs,
    focusedAiChatTabId: value.focusedAiChatTabId,
    focusedBrowserTabId: value.focusedBrowserTabId,
    focusedForgeViewerTabId: value.focusedForgeViewerTabId,
    activeWorkspaceContentTab: value.activeWorkspaceContentTab,
    isTaskBoardOpen: value.isTaskBoardOpen,
    isSpecBrowserOpen: value.isSpecBrowserOpen,
    isNoteBrowserOpen: value.isNoteBrowserOpen,
    installCommandDrafts: value.installCommandDrafts,
    isCreatingTask: value.isCreatingTask,
    isCreatingSpec: value.isCreatingSpec,
    isCreatingNote: value.isCreatingNote
  };
  const uiValue: WorkspaceSidebarUiValue = {
    collapsed: value.collapsed,
    collapsedWorkspaceIds: value.collapsedWorkspaceIds,
    isCliSectionCollapsed: value.isCliSectionCollapsed,
    onCollapsedWorkspaceIdsChange: value.onCollapsedWorkspaceIdsChange,
    onCliSectionCollapsedChange: value.onCliSectionCollapsedChange,
    onToggleCollapsed: value.onToggleCollapsed
  };
  const actionsValue: WorkspaceSidebarActionsValue = {
    onChooseProject: value.onChooseProject,
    onCloseProject: value.onCloseProject,
    onRemoveProject: value.onRemoveProject,
    onRefresh: value.onRefresh,
    onRefreshCatalog: value.onRefreshCatalog,
    onResetWorkspaces: value.onResetWorkspaces,
    onOpenCreateAgent: value.onOpenCreateAgent,
    onOpenCreateTerminal: value.onOpenCreateTerminal,
    onResumeThread: value.onResumeThread,
    onArchiveThread: value.onArchiveThread,
    onLaunchWorkspaceTerminal: value.onLaunchWorkspaceTerminal,
    onLaunchWorkspaceScript: value.onLaunchWorkspaceScript,
    onOpenWorkspaceTerminalPresets: value.onOpenWorkspaceTerminalPresets,
    onOpenWorkspaceBrowser: value.onOpenWorkspaceBrowser,
    onFocusWorkspace: value.onFocusWorkspace,
    onFocusWorkspaceView: value.onFocusWorkspaceView,
    onFocusWorkspaceWorktree: value.onFocusWorkspaceWorktree,
    onOpenWorkflowRunChangeRequest: value.onOpenWorkflowRunChangeRequest,
    onOpenCreateAgentOnWorktree: value.onOpenCreateAgentOnWorktree,
    onOpenCreateTerminalOnWorktree: value.onOpenCreateTerminalOnWorktree,
    onOpenCreateWorktree: value.onOpenCreateWorktree,
    onLaunchQuickTerminalOnWorktree: value.onLaunchQuickTerminalOnWorktree,
    onCheckoutWorkspaceBranch: value.onCheckoutWorkspaceBranch,
    onLaunchWorktreeScript: value.onLaunchWorktreeScript,
    onRemoveWorktree: value.onRemoveWorktree,
    onFocusAgent: value.onFocusAgent,
    onFocusTerminal: value.onFocusTerminal,
    onFocusWorkspaceAgent: value.onFocusWorkspaceAgent,
    onFocusWorkspaceTerminal: value.onFocusWorkspaceTerminal,
    onRestartAgent: value.onRestartAgent,
    onDestroyAgentRequest: value.onDestroyAgentRequest,
    onRenameTerminal: value.onRenameTerminal,
    onDestroyTerminal: value.onDestroyTerminal,
    onOpenTask: value.onOpenTask,
    onCreateTask: value.onCreateTask,
    onOpenSpec: value.onOpenSpec,
    onCreateSpec: value.onCreateSpec,
    onDeleteSpec: value.onDeleteSpec,
    onGenerateTasksFromSpec: value.onGenerateTasksFromSpec,
    onOpenNote: value.onOpenNote,
    onCreateNote: value.onCreateNote,
    onDeleteNote: value.onDeleteNote,
    onOpenTaskBoard: value.onOpenTaskBoard,
    onOpenSpecBrowser: value.onOpenSpecBrowser,
    onOpenNoteBrowser: value.onOpenNoteBrowser,
    onOpenAiChatFromSidebar: value.onOpenAiChatFromSidebar,
    onFocusWorkspaceAiChatTab: value.onFocusWorkspaceAiChatTab,
    onToggleTaskComplete: value.onToggleTaskComplete,
    onDeleteTask: value.onDeleteTask,
    onInstallDraftChange: value.onInstallDraftChange,
    onInstallTool: value.onInstallTool,
    onRemoveTool: value.onRemoveTool,
    onOpenCliSettings: value.onOpenCliSettings
  };

  return (
    <WorkspaceSidebarRuntimeContext.Provider value={runtimeValue}>
      <WorkspaceSidebarUiContext.Provider value={uiValue}>
        <WorkspaceSidebarActionsContext.Provider value={actionsValue}>
          {children}
        </WorkspaceSidebarActionsContext.Provider>
      </WorkspaceSidebarUiContext.Provider>
    </WorkspaceSidebarRuntimeContext.Provider>
  );
}

function useContextValue<T>(context: React.Context<T | null>, label: string): T {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${label} must be used within a WorkspaceSidebarProvider.`);
  }
  return value;
}

export function useWorkspaceSidebarRuntime(): WorkspaceSidebarRuntimeValue {
  return useContextValue(WorkspaceSidebarRuntimeContext, "useWorkspaceSidebarRuntime");
}

export function useWorkspaceSidebarUi(): WorkspaceSidebarUiValue {
  return useContextValue(WorkspaceSidebarUiContext, "useWorkspaceSidebarUi");
}

export function useWorkspaceSidebarActions(): WorkspaceSidebarActionsValue {
  return useContextValue(WorkspaceSidebarActionsContext, "useWorkspaceSidebarActions");
}

export function useWorkspaceSidebarContext(): WorkspaceSidebarProps {
  return {
    ...useWorkspaceSidebarRuntime(),
    ...useWorkspaceSidebarUi(),
    ...useWorkspaceSidebarActions()
  };
}
