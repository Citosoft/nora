import type {
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
  ForgeCreatePullRequestPayload,
  ForgeOverview,
  ForgeRepoSummary,
  ForgeRequestOptions,
  ForgeWorkItemAction,
  ForgeWorkItemDetail,
  ForgeWorkItemKind,
  ForgeWorkItemSummary,
  ForgeWorkflowRunDetail
} from "@shared/appTypes";
import type { CountDiffLinesFn, ForgeProviderRemoteAdapter } from "../types/forgeRemote.types";
import { createGithubForgeRemoteAdapter } from "./forge-remote/githubAdapter";
import { createGitlabForgeRemoteAdapter } from "./forge-remote/gitlabAdapter";

export function createForgeRemoteOps(countDiffLines: CountDiffLinesFn) {
  const providerAdapters: Record<ForgeRepoSummary["provider"], ForgeProviderRemoteAdapter> = {
    github: createGithubForgeRemoteAdapter(countDiffLines),
    gitlab: createGitlabForgeRemoteAdapter(countDiffLines)
  };

  function getAdapterForRepo(repo: ForgeRepoSummary): ForgeProviderRemoteAdapter {
    return providerAdapters[repo.provider];
  }

  async function fetchForgeOverviewForRepo(
    repo: ForgeRepoSummary,
    options: ForgeRequestOptions
  ): Promise<ForgeOverview> {
    return getAdapterForRepo(repo).fetchOverviewForRepo(repo, options);
  }

  async function fetchGitlabUserMergeRequests(
    host: string,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemSummary[]> {
    return providerAdapters.gitlab.fetchUserMergeRequests(host, options);
  }

  async function fetchForgeBranchPullRequestStatusForRepo(
    repo: ForgeRepoSummary,
    branch: string,
    options: ForgeRequestOptions
  ): Promise<ForgeBranchPullRequestStatus | null> {
    return getAdapterForRepo(repo).fetchBranchPullRequestStatusForRepo(repo, branch, options);
  }

  async function fetchForgeWorkItemDetail(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemDetail> {
    return getAdapterForRepo(repo).fetchWorkItemDetail(repo, kind, number, options);
  }

  async function fetchForgeWorkflowRunDetailForRepo(
    repo: ForgeRepoSummary,
    runId: number,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkflowRunDetail> {
    return getAdapterForRepo(repo).fetchWorkflowRunDetailForRepo(repo, runId, options);
  }

  async function performForgeWorkItemActionForRepo(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ): Promise<void> {
    await getAdapterForRepo(repo).performWorkItemActionForRepo(repo, kind, number, action, options);
  }

  async function addForgeWorkItemCommentForRepo(
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ): Promise<void> {
    await getAdapterForRepo(repo).addWorkItemCommentForRepo(repo, kind, number, payload, options);
  }

  async function createForgePullRequestForRepo(
    repo: ForgeRepoSummary,
    sourceBranch: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ): Promise<ForgeWorkItemDetail> {
    return getAdapterForRepo(repo).createPullRequestForRepo(repo, sourceBranch, payload, options);
  }

  return {
    fetchForgeOverviewForRepo,
    fetchGitlabUserMergeRequests,
    fetchForgeBranchPullRequestStatusForRepo,
    fetchForgeWorkItemDetail,
    fetchForgeWorkflowRunDetailForRepo,
    performForgeWorkItemActionForRepo,
    addForgeWorkItemCommentForRepo,
    createForgePullRequestForRepo
  };
}
