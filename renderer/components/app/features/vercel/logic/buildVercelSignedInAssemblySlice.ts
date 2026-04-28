import type { VercelSignedInAssemblySliceInput } from "@/components/app/features/vercel/types/vercelSignedInAssemblySlice.types";
import type { AppShellSignedInVercelSources } from "@/components/app/types/appShellSignedInAssemblySources.types";

export const buildVercelSignedInAssemblySlice = ({
  integration,
  vercelAccountLabel,
  vercelToken
}: VercelSignedInAssemblySliceInput): AppShellSignedInVercelSources => {
  const v = integration;
  return {
    linkCurrentWorkspaceToVercelProject: v.linkCurrentWorkspaceToVercelProject,
    refreshVercelDeployments: v.refreshVercelDeployments,
    refreshVercelProjects: v.refreshVercelProjects,
    linkedVercelProject: v.linkedVercelProject,
    suggestedVercelProject: v.suggestedVercelProject,
    unlinkCurrentWorkspaceFromVercelProject: v.unlinkCurrentWorkspaceFromVercelProject,
    vercelAccountLabel,
    vercelDeployments: v.vercelDeployments,
    vercelDeploymentsErrorMessage: v.vercelDeploymentsErrorMessage,
    vercelProjects: v.vercelProjects,
    vercelProjectsErrorMessage: v.vercelProjectsErrorMessage,
    vercelToken,
    redeployVercelDeployment: v.redeployVercelDeployment,
    redeployingVercelDeploymentId: v.redeployingVercelDeploymentId,
    vercelDeploymentsLoading: v.isLoadingVercelDeployments,
    vercelProjectsLoading: v.isLoadingVercelProjects
  };
};
