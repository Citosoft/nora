import type { AppShellSignedInAssemblySources } from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { ChangesPanelSectionBuildDeps } from "@/components/app/types/changesPanelSectionBuild.types";

type SignedInChangesPanelAssemblySlice = Pick<
  AppShellSignedInAssemblySources,
  | "core"
  | "forge"
  | "vercel"
  | "gitBranches"
  | "sessionSurface"
  | "chromeShell"
  | "changesFileHandlers"
  | "forgeWorkItemMutators"
  | "modalExtras"
  | "workspaceContent"
>;

export const assembleSignedInChangesPanelSectionBuild = (
  s: SignedInChangesPanelAssemblySlice
): ChangesPanelSectionBuildDeps => {
  const {
    core,
    forge,
    vercel,
    gitBranches,
    sessionSurface,
    chromeShell,
    changesFileHandlers,
    forgeWorkItemMutators,
    modalExtras,
    workspaceContent
  } = s;

  return {
    ...changesFileHandlers,
    activeBranch: gitBranches.activeBranch,
    activeChangesPanelTab: chromeShell.activeChangesPanelTab,
    addForgeWorkItemComment: forge.addForgeWorkItemComment,
    appSettingsAi: core.appSettings.ai,
    captureError: core.captureError,
    forgeBranchPullRequestStatus: forge.forgeBranchPullRequestStatus,
    forgeOverview: forge.forgeOverview,
    forgeWorkItemDetail: forge.forgeWorkItemDetail,
    handleSpawnForgeIssueAgent: forge.handleSpawnForgeIssueAgent,
    isChangesSidebarCollapsed: chromeShell.isChangesSidebarCollapsed,
    isLoadingForgeOverview: forge.isLoadingForgeOverview,
    linkCurrentWorkspaceToVercelProject: vercel.linkCurrentWorkspaceToVercelProject,
    loadForgeWorkItemDetail: forge.loadForgeWorkItemDetail,
    openSettingsPage: core.openSettingsPage,
    performForgeWorkItemAction: forge.performForgeWorkItemAction,
    redeployVercelDeployment: vercel.redeployVercelDeployment,
    redeployingVercelDeploymentId: vercel.redeployingVercelDeploymentId,
    refreshForgeOverview: forge.refreshForgeOverview,
    refreshVercelDeployments: vercel.refreshVercelDeployments,
    refreshVercelProjects: vercel.refreshVercelProjects,
    linkedVercelProject: vercel.linkedVercelProject,
    resolveGitlabForgeRepoOverride: forge.resolveGitlabForgeRepoOverride,
    resolvedTheme: core.resolvedTheme,
    safely: core.safely,
    selectedChange: sessionSurface.selectedChange,
    setActiveChangesPanelTab: chromeShell.setActiveChangesPanelTab,
    setActiveWorkspaceContentTab: sessionSurface.setActiveWorkspaceContentTab,
    ...forgeWorkItemMutators,
    setIsCenterDiffExpanded: sessionSurface.setIsCenterDiffExpanded,
    setIsCreatePullRequestDialogOpen: modalExtras.setIsCreatePullRequestDialogOpen,
    setIsTaskBoardOpen: workspaceContent.setIsTaskBoardOpen,
    setTaskEditorState: workspaceContent.setTaskEditorState,
    suggestedVercelProject: vercel.suggestedVercelProject,
    unlinkCurrentWorkspaceFromVercelProject: vercel.unlinkCurrentWorkspaceFromVercelProject,
    vercelAccountLabel: vercel.vercelAccountLabel,
    vercelDeployments: vercel.vercelDeployments,
    vercelDeploymentsErrorMessage: vercel.vercelDeploymentsErrorMessage,
    vercelDeploymentsLoading: vercel.vercelDeploymentsLoading,
    vercelProjects: vercel.vercelProjects,
    vercelProjectsErrorMessage: vercel.vercelProjectsErrorMessage,
    vercelProjectsLoading: vercel.vercelProjectsLoading,
    vercelToken: vercel.vercelToken
  };
};
