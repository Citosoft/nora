export type ForgeProvider = "github" | "gitlab";
export type OAuthProvider = ForgeProvider | "vercel";

export interface ForgeOAuthProviderConfig {
  provider: OAuthProvider;
  label: string;
  host: string;
  clientIdConfigured: boolean;
}

export interface ForgeOAuthResult {
  provider: OAuthProvider;
  accessToken: string;
  accountLabel: string | null;
}

export interface ForgeOAuthDevicePrompt {
  provider: OAuthProvider;
  providerLabel: string;
  userCode: string;
  verificationUri: string;
}

export interface ForgeRepoSummary {
  provider: ForgeProvider;
  host: string;
  owner: string;
  name: string;
  fullName: string;
  webUrl: string;
}

export interface ForgeWorkItemSummary {
  id: string;
  number: number;
  title: string;
  state: string;
  author: string | null;
  sourceRepository: string | null;
  updatedAt: string;
  webUrl: string;
}

export type ForgeWorkItemKind = "pull_request" | "issue";

export interface ForgeWorkItemComment {
  id: string;
  author: string | null;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
  path: string | null;
  oldLine: number | null;
  newLine: number | null;
}

export interface ForgeWorkflowRunSummary {
  id: string;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string | null;
  event: string | null;
  updatedAt: string;
  webUrl: string;
}

export interface ForgeWorkflowRunStepDetail {
  id: string;
  name: string;
  number: number;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ForgeWorkflowRunJobDetail {
  id: string;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  webUrl: string | null;
  steps: ForgeWorkflowRunStepDetail[];
}

export interface ForgeWorkflowRunDetail {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string | null;
  event: string | null;
  createdAt: string;
  updatedAt: string;
  webUrl: string;
  jobs: ForgeWorkflowRunJobDetail[];
}

export interface ForgeWorkItemDetail {
  kind: ForgeWorkItemKind;
  item: ForgeWorkItemSummary;
  body: string;
  labels: string[];
  changes: ForgeWorkItemFileChange[];
  comments: ForgeWorkItemComment[];
  capabilities: ForgeWorkItemDetailCapabilities;
  canMerge: boolean;
  canClose: boolean;
  canReopen: boolean;
}

export interface ForgeWorkItemDetailCapabilities {
  supportsInlineComments: boolean;
}

export interface ForgeWorkItemFileChange {
  id: string;
  path: string;
  previousPath: string | null;
  additions: number;
  deletions: number;
  diff: string;
}

export interface ForgeInlineCommentTarget {
  path: string;
  oldLine?: number | null;
  newLine?: number | null;
}

export interface ForgeAddCommentPayload {
  body: string;
  inlineTarget?: ForgeInlineCommentTarget | null;
}

export interface ForgeOverview {
  repo: ForgeRepoSummary | null;
  pullRequests: ForgeWorkItemSummary[];
  issues: ForgeWorkItemSummary[];
  workflowRuns: ForgeWorkflowRunSummary[];
  gitlabUserMergeRequests: ForgeWorkItemSummary[];
  gitlabUserMergeRequestsErrorMessage: string | null;
  errorMessage: string | null;
}

export type GithubBranchPullRequestState = "no_pull_request" | "draft" | "open" | "closed" | "merged";

export interface ForgeBranchPullRequestStatus {
  branch: string;
  branchExistsOnRemote: boolean;
  state: GithubBranchPullRequestState;
  label: "No pull request" | "Draft" | "Open" | "Closed" | "Merged";
  pullRequestNumber: number | null;
  webUrl: string | null;
}

export interface ForgeRequestOptions {
  githubToken?: string | null;
  gitlabToken?: string | null;
  gitlabHost?: string | null;
  forgeRepoHostOverride?: string | null;
  forgeRepoFullNameOverride?: string | null;
}

export type ForgeWorkItemAction = "merge" | "close" | "reopen";

export interface ForgeCreatePullRequestPayload {
  title: string;
  body: string;
  baseBranch: string;
  draft?: boolean;
}

export interface VercelProjectLink {
  type: string | null;
  org: string | null;
  repo: string | null;
  repoUrl: string | null;
  productionBranch: string | null;
}

export interface VercelProjectSummary {
  id: string;
  name: string;
  accountId: string | null;
  teamId: string | null;
  accountSlug: string | null;
  accountName: string | null;
  framework: string | null;
  rootDirectory: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  webUrl: string | null;
  link: VercelProjectLink | null;
}

export interface VercelDeploymentSummary {
  id: string;
  projectId: string;
  projectName: string;
  teamId: string | null;
  url: string | null;
  inspectorUrl: string | null;
  createdAt: string;
  state: string;
  readyState: string | null;
  target: string | null;
  branch: string | null;
  commitSha: string | null;
  creator: string | null;
}

export interface VercelRedeployPayload {
  deploymentId: string;
  vercelProjectId: string;
  teamId?: string | null;
  target?: string | null;
}

export interface VercelRuntimeLogEntry {
  level: string;
  message: string;
  rowId: string;
  source: string;
  timestampInMs: number;
  deploymentId: string | null;
  domain: string | null;
  messageTruncated: boolean;
  requestMethod: string | null;
  requestPath: string | null;
  responseStatusCode: number | null;
}

export interface VercelRuntimeLogStreamRequest {
  token: string;
  vercelProjectId: string;
  deploymentId: string;
  teamId?: string | null;
}

export type VercelRuntimeLogStreamEvent =
  | {
      type: "connected";
      deploymentId: string;
    }
  | {
      type: "entry";
      deploymentId: string;
      entry: VercelRuntimeLogEntry;
    }
  | {
      type: "error";
      deploymentId: string;
      message: string;
    }
  | {
      type: "ended";
      deploymentId: string;
    };
