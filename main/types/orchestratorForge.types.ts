import type {
  AppState,
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
  ForgeCreatePullRequestPayload,
  ForgeOverview,
  ForgeRepoSummary,
  ForgeRequestOptions,
  ForgeWorkItemAction,
  ForgeWorkItemDetail,
  ForgeWorkflowRunDetail,
  ForgeWorkItemKind,
  ForgeWorkItemSummary,
  ProjectSummary
} from "@shared/appTypes";
import type { WorkspaceTarget } from "./internal.types";

export interface ForgeHelperDeps {
  resolveProjectSummaryById: (projectId: string) => Promise<ProjectSummary>;
  getProjectTarget: (project: ProjectSummary) => WorkspaceTarget;
  getWorkspaceForgeRepo: (target: WorkspaceTarget) => Promise<ForgeRepoSummary | null>;
  fetchForgeOverviewForRepo: (repo: ForgeRepoSummary, options: ForgeRequestOptions) => Promise<ForgeOverview>;
  fetchGitlabUserMergeRequests: (
    host: string,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemSummary[]>;
  fetchForgeBranchPullRequestStatusForRepo: (
    repo: ForgeRepoSummary,
    branch: string,
    options: ForgeRequestOptions
  ) => Promise<ForgeBranchPullRequestStatus | null>;
  fetchForgeWorkItemDetail: (
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
  fetchForgeWorkflowRunDetailForRepo: (
    repo: ForgeRepoSummary,
    runId: number,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkflowRunDetail>;
  addForgeWorkItemCommentForRepo: (
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ) => Promise<void>;
  createForgePullRequestForRepo: (
    repo: ForgeRepoSummary,
    sourceBranch: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
  performForgeWorkItemActionForRepo: (
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ) => Promise<void>;
  getSnapshot: () => AppState;
  getActiveChangesRoot: (state: AppState) => string;
  hasRemoteTrackingBranchForTarget: (target: WorkspaceTarget) => Promise<boolean>;
  hasRemoteBranchForTarget: (target: WorkspaceTarget, branch: string) => Promise<boolean>;
  pushWorkspaceChanges: (target: WorkspaceTarget) => Promise<void>;
  readCurrentBranch: (target: WorkspaceTarget) => Promise<string>;
}

export interface ForgeHelpers {
  getForgeOverview: (projectId: string, options: ForgeRequestOptions) => Promise<ForgeOverview>;
  getForgeBranchPullRequestStatus: (
    projectId: string,
    branch: string,
    options: ForgeRequestOptions
  ) => Promise<ForgeBranchPullRequestStatus | null>;
  getForgeWorkItemDetail: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
  getForgeWorkflowRunDetail: (
    projectId: string,
    runId: number,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkflowRunDetail>;
  addForgeWorkItemComment: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
  createForgePullRequest: (
    projectId: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
  performForgeWorkItemAction: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
}
