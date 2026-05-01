import type {
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
  ForgeCreatePullRequestPayload,
  ForgeOAuthProviderConfig,
  ForgeRequestOptions,
  ForgeWorkItemAction,
  ForgeWorkItemKind,
  VercelRedeployPayload,
  VercelRuntimeLogStreamRequest
} from "@shared/appTypes";
import type { IntegrationGateway } from "@shared/ipc/types/integrationGateway.types";
import { createNoraClient, NORA_INTEGRATION_CLIENT_METHODS } from "./noraClientFactory";

const baseIntegrationClient = createNoraClient(NORA_INTEGRATION_CLIENT_METHODS);

export const noraIntegrationClient: IntegrationGateway = {
  ...baseIntegrationClient,
  getForgeOAuthProviders: (): Promise<ForgeOAuthProviderConfig[]> => baseIntegrationClient.getForgeOAuthProviders(),
  startForgeOAuth: (provider: "github" | "gitlab" | "vercel") => baseIntegrationClient.startForgeOAuth(provider),
  getForgeOverview: (projectId: string, options: ForgeRequestOptions) => baseIntegrationClient.getForgeOverview(projectId, options),
  getForgeBranchPullRequestStatus: (projectId: string, branch: string, options: ForgeRequestOptions): Promise<ForgeBranchPullRequestStatus | null> =>
    baseIntegrationClient.getForgeBranchPullRequestStatus(projectId, branch, options),
  getForgeWorkItemDetail: (projectId: string, kind: ForgeWorkItemKind, number: number, options: ForgeRequestOptions) =>
    baseIntegrationClient.getForgeWorkItemDetail(projectId, kind, number, options),
  getForgeWorkflowRunDetail: (projectId: string, runId: number, options: ForgeRequestOptions) =>
    baseIntegrationClient.getForgeWorkflowRunDetail(projectId, runId, options),
  performForgeWorkItemAction: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ) => baseIntegrationClient.performForgeWorkItemAction(projectId, kind, number, action, options),
  addForgeWorkItemComment: (
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ) => baseIntegrationClient.addForgeWorkItemComment(projectId, kind, number, payload, options),
  createForgePullRequest: (projectId: string, payload: ForgeCreatePullRequestPayload, options: ForgeRequestOptions) =>
    baseIntegrationClient.createForgePullRequest(projectId, payload, options),
  listVercelProjects: (token: string) => baseIntegrationClient.listVercelProjects(token),
  listVercelDeployments: (token: string, projectId: string, teamId?: string | null) =>
    baseIntegrationClient.listVercelDeployments(token, projectId, teamId),
  redeployVercelDeployment: (token: string, payload: VercelRedeployPayload) => baseIntegrationClient.redeployVercelDeployment(token, payload),
  startVercelRuntimeLogStream: (request: VercelRuntimeLogStreamRequest) => baseIntegrationClient.startVercelRuntimeLogStream(request),
  stopVercelRuntimeLogStream: () => baseIntegrationClient.stopVercelRuntimeLogStream(),
  onVercelRuntimeLogEvent: (listener) => baseIntegrationClient.onVercelRuntimeLogEvent(listener)
};
