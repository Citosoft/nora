import type { VercelRuntimeLogStreamEvent } from "@shared/appTypes";
import type { IntegrationBridge } from "@shared/ipc/types/integrationGateway.types";

import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createIntegrationBridge(): IntegrationBridge {
  return {
    getForgeOAuthProviders: () => invokeIpc("app:get-forge-oauth-providers"),
    startForgeOAuth: (provider) => invokeIpc("app:start-forge-oauth", provider),
    getForgeOverview: (projectId, options) => invokeIpc("app:get-forge-overview", projectId, options),
    getForgeBranchPullRequestStatus: (projectId, branch, options) =>
      invokeIpc("app:get-forge-branch-pull-request-status", projectId, branch, options),
    getForgeWorkItemDetail: (projectId, kind, number, options) =>
      invokeIpc("app:get-forge-work-item-detail", projectId, kind, number, options),
    getForgeWorkflowRunDetail: (projectId, runId, options) =>
      invokeIpc("app:get-forge-workflow-run-detail", projectId, runId, options),
    addForgeWorkItemComment: (projectId, kind, number, payload, options) =>
      invokeIpc("app:add-forge-work-item-comment", projectId, kind, number, payload, options),
    createForgePullRequest: (projectId, payload, options) =>
      invokeIpc("app:create-forge-pull-request", projectId, payload, options),
    performForgeWorkItemAction: (projectId, kind, number, action, options) =>
      invokeIpc("app:perform-forge-work-item-action", projectId, kind, number, action, options),
    listVercelProjects: (token) => invokeIpc("app:list-vercel-projects", token),
    listVercelDeployments: (token, vercelProjectId, teamId) =>
      invokeIpc("app:list-vercel-deployments", token, vercelProjectId, teamId),
    redeployVercelDeployment: (token, payload) => invokeIpc("app:redeploy-vercel-deployment", token, payload),
    startVercelRuntimeLogStream: (request) => invokeIpc("app:start-vercel-runtime-log-stream", request),
    stopVercelRuntimeLogStream: () => invokeIpc("app:stop-vercel-runtime-log-stream"),
    onVercelRuntimeLogEvent: (listener) =>
      subscribeToIpcEvent<VercelRuntimeLogStreamEvent>("vercel-runtime-log:event", listener)
  };
}
