import { buildVercelSignedInAssemblySlice } from "@/components/app/features/vercel/logic/buildVercelSignedInAssemblySlice";
import type { UseVercelIntegrationResult } from "@/components/app/types/appHooks.types";
import assert from "node:assert/strict";
import test from "node:test";

const createVercelIntegrationFixture = (overrides: Partial<UseVercelIntegrationResult> = {}): UseVercelIntegrationResult => ({
  vercelProjects: [],
  isLoadingVercelProjects: false,
  vercelProjectsErrorMessage: null,
  vercelDeployments: [],
  isLoadingVercelDeployments: false,
  vercelDeploymentsErrorMessage: null,
  vercelRuntimeLogs: [],
  isLoadingVercelRuntimeLogs: false,
  isStreamingVercelRuntimeLogs: false,
  vercelRuntimeLogsErrorMessage: null,
  redeployingVercelDeploymentId: null,
  linkedVercelProject: null,
  suggestedVercelProject: null,
  activeVercelLogDeployment: null,
  disconnectVercelAccount: () => {},
  refreshVercelProjects: async () => {},
  refreshVercelDeployments: async () => {},
  refreshVercelRuntimeLogs: async () => {},
  linkCurrentWorkspaceToVercelProject: () => {},
  unlinkCurrentWorkspaceFromVercelProject: () => {},
  redeployVercelDeployment: async () => {},
  ...overrides
});

test("buildVercelSignedInAssemblySlice maps loading flags from integration", () => {
  const slice = buildVercelSignedInAssemblySlice({
    integration: createVercelIntegrationFixture({
      isLoadingVercelDeployments: true,
      isLoadingVercelProjects: false
    }),
    vercelAccountLabel: "acct",
    vercelToken: "tok"
  });

  assert.equal(slice.vercelDeploymentsLoading, true);
  assert.equal(slice.vercelProjectsLoading, false);
  assert.equal(slice.vercelAccountLabel, "acct");
  assert.equal(slice.vercelToken, "tok");
});
