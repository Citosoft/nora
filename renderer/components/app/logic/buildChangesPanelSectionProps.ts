import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { noraWorkspaceManagementClient } from "@/components/app/clients/noraWorkspaceManagementClient";
import { parseForgeWorkflowRunNumber } from "@/components/app/logic/forgeWorkflowRuns";
import type { ChangesPanelSectionProps } from "@/components/app/types/changesPanel.types";
import type { ChangesPanelSectionBuildDeps } from "@/components/app/types/changesPanelSectionBuild.types";
import type { AppState } from "@shared/appTypes";

export const buildChangesPanelSectionProps = (
  d: ChangesPanelSectionBuildDeps,
  snapshot: AppState
): ChangesPanelSectionProps => ({
  forge: {
    overview: d.forgeOverview,
    branchPullRequestStatus: d.forgeBranchPullRequestStatus,
    loading: d.isLoadingForgeOverview,
    detail: null,
    detailLoading: false,
    detailErrorMessage: null,
    actionLoading: false,
    commentLoading: false,
    onRefresh: d.refreshForgeOverview,
    onOpenUrl: (url) => {
      void noraSystemClient.openExternalUrl(url);
    },
    onOpenForgeViewer: (kind, item) => {
      if (!snapshot.project) {
        return;
      }
      const repoOverride = kind === "pull_request" ? d.resolveGitlabForgeRepoOverride(item) : null;
      d.openForgeViewer(snapshot.project.id, kind, item.number, `#${item.number} ${item.title}`, repoOverride);
    },
    onOpenForgeItem: (kind, item) => {
      if (!snapshot.project) {
        return;
      }
      const repoOverride = kind === "pull_request" ? d.resolveGitlabForgeRepoOverride(item) : null;
      d.openForgeViewer(snapshot.project.id, kind, item.number, `#${item.number} ${item.title}`, repoOverride);
    },
    onOpenForgeWorkflowRun: (run) => {
      if (!snapshot.project) {
        return;
      }
      const runId = parseForgeWorkflowRunNumber(run);
      if (!runId) {
        return;
      }
      d.openForgeViewer(snapshot.project.id, "workflow_run", runId, run.name);
    },
    onBackFromForgeItem: () => {
      d.setForgeWorkItemDetail(null);
      d.setForgeWorkItemDetailErrorMessage(null);
    },
    onRefreshForgeItem: () => {
      if (!d.forgeWorkItemDetail) {
        return;
      }
      void d.loadForgeWorkItemDetail(d.forgeWorkItemDetail.kind, d.forgeWorkItemDetail.item.number);
    },
    onForgeAction: (action) => {
      void d.performForgeWorkItemAction(action);
    },
    onForgeCommentSubmit: (payload) => d.addForgeWorkItemComment(payload),
    onSpawnIssueAgent: (toolId) => d.handleSpawnForgeIssueAgent(toolId),
    onSpawnReviewAgent: (toolId, selections, targetMode) => d.handleSpawnForgeReviewAgent(toolId, selections, targetMode),
    onOpenCreatePullRequest: () => d.setIsCreatePullRequestDialogOpen(true)
  },
  vercel: {
    vercelToken: d.vercelToken,
    vercelAccountLabel: d.vercelAccountLabel,
    vercelProjects: d.vercelProjects,
    vercelDeployments: d.vercelDeployments,
    linkedVercelProject: d.linkedVercelProject,
    suggestedVercelProject: d.suggestedVercelProject,
    vercelProjectsLoading: d.vercelProjectsLoading,
    vercelDeploymentsLoading: d.vercelDeploymentsLoading,
    redeployingVercelDeploymentId: d.redeployingVercelDeploymentId,
    vercelProjectsErrorMessage: d.vercelProjectsErrorMessage,
    vercelDeploymentsErrorMessage: d.vercelDeploymentsErrorMessage,
    onRefreshVercelProjects: () => {
      void d.refreshVercelProjects();
    },
    onRefreshVercelDeployments: () => {
      void d.refreshVercelDeployments();
    },
    onRedeployVercelDeployment: (deployment) => {
      void d.redeployVercelDeployment(deployment);
    },
    onOpenVercelSettings: () => d.openSettingsPage("integrations"),
    onLinkVercelProject: (projectId) => {
      d.linkCurrentWorkspaceToVercelProject(projectId);
    },
    onUnlinkVercelProject: d.unlinkCurrentWorkspaceFromVercelProject
  },
  chrome: {
    resolvedTheme: d.resolvedTheme,
    collapsed: d.isChangesSidebarCollapsed,
    activeTab: d.activeChangesPanelTab,
    activeFilePath: d.fileEditorActivePath,
    activeBranch: d.activeBranch,
    selectedChange: d.selectedChange,
    onActiveTabChange: d.setActiveChangesPanelTab,
    onRefreshChanges: async () => {
      await d.safely(() => noraWorkspaceManagementClient.refreshWorkspace());
    },
    onSelectChange: async (pathName) => {
      const next = await d.safely(() => noraWorkspaceClient.selectChange(pathName));
      if (!next) {
        return;
      }
      d.setTaskEditorState(null);
      d.setIsTaskBoardOpen(false);
      d.setIsCenterFullDiffExpanded(false);
      d.setIsCenterDiffExpanded(true);
      d.setActiveWorkspaceContentTab("diff");
    },
    onDiscardChange: (pathName) => d.safely(() => noraWorkspaceClient.discardChange(pathName)),
    onOpenFullDiff: () => {
      d.setTaskEditorState(null);
      d.setIsTaskBoardOpen(false);
      d.setIsCenterFullDiffExpanded(true);
      d.setIsCenterDiffExpanded(true);
      d.setActiveWorkspaceContentTab("diff");
    },
    onCommitChanges: (message, paths) => d.safely(() => noraWorkspaceClient.commitChanges(message, paths)),
    canGenerateAiCommitMessage:
      d.appSettingsAi.simpleTaskProvider === "local" ||
      Object.values(d.appSettingsAi.apiKeys).some((apiKey) => apiKey.trim().length > 0),
    onGenerateCommitMessage: async (paths) => {
      try {
        return await noraWorkspaceClient.generateCommitMessage({ paths });
      } catch (error: unknown) {
        d.captureError(error);
        return null;
      }
    },
    onPullChanges: () => d.safely(() => noraWorkspaceClient.pullChanges()),
    onPushChanges: () => d.safely(() => noraWorkspaceClient.pushChanges()),
    onEditChange: (pathName) => {
      void d.openFileEditor(pathName, {
        rootPath: snapshot.changesRoot || snapshot.project?.rootPath || null
      });
    },
    onInspectCommit: (hash) => d.safely(() => noraWorkspaceClient.inspectCommit(hash)),
    onClearCommitInspection: () => d.safely(() => noraWorkspaceClient.clearCommitInspection())
  },
  fileHandlers: d.fileHandlers,
  openCreateAgentDialog: d.openCreateAgentDialog
});
