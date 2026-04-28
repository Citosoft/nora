import type { WorkspaceGateway } from "@shared/ipc/types/workspaceGateway.types";
import { createNoraClient, NORA_WORKSPACE_CLIENT_METHODS } from "./noraClientFactory";

const baseWorkspaceClient = createNoraClient(NORA_WORKSPACE_CLIENT_METHODS);

export const noraWorkspaceClient: WorkspaceGateway = {
  ...baseWorkspaceClient,
  connectRemoteProject: (mountPoint: string, host?: string) => baseWorkspaceClient.connectRemoteProject(mountPoint, host ?? ""),
  commitChanges: (message: string, paths?: string[]) => baseWorkspaceClient.commitChanges({ message, paths })
};
