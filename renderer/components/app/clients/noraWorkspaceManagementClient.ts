import type {
  WorkspaceManagementClient,
  WorkspaceManagementGatewayDeps
} from "@/components/app/types/workspaceManagementClient.types";

import { noraWorkspaceClient } from "./noraWorkspaceClient";

export function createWorkspaceManagementClient(
  workspaceGateway: WorkspaceManagementGatewayDeps
): WorkspaceManagementClient {
  return {
    closeWorkspace: () => workspaceGateway.closeProject(),
    refreshWorkspace: () => workspaceGateway.refresh(),
    removeWorkspace: (projectRoot) => workspaceGateway.removeProject(projectRoot),
    resetWorkspaceList: () => workspaceGateway.resetWorkspaces(),
    unmountRemoteMount: (mountPoint) => workspaceGateway.unmountRemoteProject(mountPoint)
  };
}

export const noraWorkspaceManagementClient = createWorkspaceManagementClient(noraWorkspaceClient);
