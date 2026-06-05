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

export type CountDiffLinesFn = (diff: string, prefix: string) => number;

export interface NormalizedInlineCommentTarget {
  path: string;
  oldLine: number | null;
  newLine: number | null;
  hasOldLine: boolean;
  hasNewLine: boolean;
}

export interface ForgeProviderRemoteAdapter {
  fetchOverviewForRepo: (repo: ForgeRepoSummary, options: ForgeRequestOptions) => Promise<ForgeOverview>;
  fetchUserMergeRequests: (host: string, options: ForgeRequestOptions) => Promise<ForgeWorkItemSummary[]>;
  fetchBranchPullRequestStatusForRepo: (
    repo: ForgeRepoSummary,
    branch: string,
    options: ForgeRequestOptions
  ) => Promise<ForgeBranchPullRequestStatus | null>;
  fetchWorkItemDetail: (
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
  fetchWorkflowRunDetailForRepo: (
    repo: ForgeRepoSummary,
    runId: number,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkflowRunDetail>;
  performWorkItemActionForRepo: (
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ) => Promise<void>;
  addWorkItemCommentForRepo: (
    repo: ForgeRepoSummary,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ) => Promise<void>;
  createPullRequestForRepo: (
    repo: ForgeRepoSummary,
    sourceBranch: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ) => Promise<ForgeWorkItemDetail>;
}
