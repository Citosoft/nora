import type { ForgeSignedInAssemblySliceInput } from "@/components/app/features/forge/types/forgeSignedInAssemblySlice.types";
import type { AppShellSignedInForgeSources } from "@/components/app/types/appShellSignedInAssemblySources.types";

export const buildForgeSignedInAssemblySlice = ({
  integration,
  resolveGitlabForgeRepoOverride,
  handleSpawnForgeIssueAgent,
  handleSpawnForgeReviewAgent,
  focusedForgeViewerTab
}: ForgeSignedInAssemblySliceInput): AppShellSignedInForgeSources => {
  const f = integration;
  return {
    forgeOverview: f.forgeOverview,
    forgeBranchPullRequestStatus: f.forgeBranchPullRequestStatus,
    isLoadingForgeOverview: f.isLoadingForgeOverview,
    forgeWorkItemDetail: f.forgeWorkItemDetail,
    isLoadingForgeWorkItemDetail: f.isLoadingForgeWorkItemDetail,
    forgeWorkItemDetailErrorMessage: f.forgeWorkItemDetailErrorMessage,
    isPerformingForgeWorkItemAction: f.isPerformingForgeWorkItemAction,
    isPostingForgeWorkItemComment: f.isPostingForgeWorkItemComment,
    addForgeWorkItemComment: f.addForgeWorkItemComment,
    loadForgeWorkItemDetail: f.loadForgeWorkItemDetail,
    performForgeWorkItemAction: f.performForgeWorkItemAction,
    refreshForgeOverview: f.refreshForgeOverview,
    resolveGitlabForgeRepoOverride,
    handleSpawnForgeIssueAgent,
    handleSpawnForgeReviewAgent,
    focusedForgeViewerTab,
    handleCreateForgePullRequest: f.handleCreateForgePullRequest
  };
};
