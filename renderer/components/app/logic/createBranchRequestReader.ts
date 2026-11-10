import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import type { BranchRequestReader } from "@/components/app/types/threadInsights.types";
import type { ForgeRequestOptions } from "@shared/appTypes";

export function createBranchRequestReader(options: ForgeRequestOptions): BranchRequestReader {
  return (projectId, branch) => noraIntegrationClient.getForgeBranchPullRequestStatus(projectId, branch, options);
}
