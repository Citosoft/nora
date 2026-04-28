import type { RemoteWorkspaceClient, RemoteWorkspaceGatewayDeps } from "@/components/app/types/remoteWorkspaceClient.types";
import type { ConnectRemoteProjectPayload } from "@shared/appTypes";

import { noraWorkspaceClient } from "./noraWorkspaceClient";

export function createRemoteWorkspaceClient(workspaceGateway: RemoteWorkspaceGatewayDeps): RemoteWorkspaceClient {
  return {
    openRemoteWorkspace: async (payload: ConnectRemoteProjectPayload) => {
      if (payload.connectionMode === "ssh") {
        return workspaceGateway.openSshProject(payload);
      }

      const { mountPoint } = await workspaceGateway.mountRemoteProject(payload);
      return workspaceGateway.connectRemoteProject(mountPoint, payload.host);
    }
  };
}

export const noraRemoteWorkspaceClient = createRemoteWorkspaceClient(noraWorkspaceClient);
