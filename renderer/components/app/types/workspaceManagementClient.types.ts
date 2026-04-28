import type { WorkspaceGateway } from "@shared/ipc/types/workspaceGateway.types";

export type WorkspaceManagementGatewayDeps = Pick<
  WorkspaceGateway,
  "closeProject" | "refresh" | "removeProject" | "resetWorkspaces" | "unmountRemoteProject"
>;

export interface WorkspaceManagementClient {
  closeWorkspace(): ReturnType<WorkspaceGateway["closeProject"]>;
  refreshWorkspace(): ReturnType<WorkspaceGateway["refresh"]>;
  removeWorkspace(projectRoot: string): ReturnType<WorkspaceGateway["removeProject"]>;
  resetWorkspaceList(): ReturnType<WorkspaceGateway["resetWorkspaces"]>;
  unmountRemoteMount(mountPoint: string): ReturnType<WorkspaceGateway["unmountRemoteProject"]>;
}
