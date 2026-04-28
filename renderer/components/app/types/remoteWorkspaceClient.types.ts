import type { AppState, ConnectRemoteProjectPayload } from "@shared/appTypes";
import type { WorkspaceGateway } from "@shared/ipc/types/workspaceGateway.types";

export type RemoteWorkspaceGatewayDeps = Pick<
  WorkspaceGateway,
  "openSshProject" | "mountRemoteProject" | "connectRemoteProject"
>;

export interface RemoteWorkspaceClient {
  openRemoteWorkspace(payload: ConnectRemoteProjectPayload): Promise<AppState>;
}
