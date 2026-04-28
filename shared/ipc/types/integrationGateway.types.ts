import type {
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
  ForgeCreatePullRequestPayload,
  ForgeOAuthProviderConfig,
  ForgeOAuthResult,
  ForgeOverview,
  ForgeRequestOptions,
  ForgeWorkItemAction,
  ForgeWorkItemDetail,
  ForgeWorkItemKind,
  OAuthProvider,
  VercelDeploymentSummary,
  VercelProjectSummary,
  VercelRedeployPayload,
  VercelRuntimeLogStreamEvent,
  VercelRuntimeLogStreamRequest
} from "../../appTypes";

export interface IntegrationBridge {
  getForgeOAuthProviders: () => Promise<ForgeOAuthProviderConfig[]>;
  startForgeOAuth: (provider: OAuthProvider) => Promise<ForgeOAuthResult>;
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
  listVercelProjects: (token: string) => Promise<VercelProjectSummary[]>;
  listVercelDeployments: (
    token: string,
    vercelProjectId: string,
    teamId?: string | null
  ) => Promise<VercelDeploymentSummary[]>;
  redeployVercelDeployment: (token: string, payload: VercelRedeployPayload) => Promise<VercelDeploymentSummary>;
  startVercelRuntimeLogStream: (request: VercelRuntimeLogStreamRequest) => Promise<void>;
  stopVercelRuntimeLogStream: () => Promise<void>;
  onVercelRuntimeLogEvent: (listener: (payload: VercelRuntimeLogStreamEvent) => void) => () => void;
}

export interface IntegrationGateway extends IntegrationBridge {}
