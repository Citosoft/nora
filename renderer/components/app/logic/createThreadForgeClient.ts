import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { normalizeForgeCreatePullRequestError } from "@/components/app/logic/appUtils";
import type { ThreadForgeClient } from "@/components/app/types/threadForge.types";
import type { ForgeRequestOptions } from "@shared/appTypes";

export function createThreadForgeClient(options: ForgeRequestOptions): ThreadForgeClient {
  return {
    connections: { github: !!options.githubToken?.trim(), gitlab: !!options.gitlabToken?.trim() },
    readBranchRequest: (projectId, branch) => noraIntegrationClient.getForgeBranchPullRequestStatus(projectId, branch, options),
    readBranchChanges: (projectId, checkoutPath) => noraIntegrationClient.getForgeBranchChanges(projectId, checkoutPath, options),
    readBranchDiff: (projectId, checkoutPath) => noraIntegrationClient.getForgeBranchDiff(projectId, checkoutPath),
    createChangeRequest: async (projectId, payload) => {
      try {
        return await noraIntegrationClient.createForgePullRequest(projectId, payload, options);
      } catch (error: unknown) {
        throw new Error(normalizeForgeCreatePullRequestError(error));
      }
    }
  };
}
