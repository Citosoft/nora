import type { useRemoteWorkspaceConnection } from "@/components/app/hooks/useRemoteWorkspaceConnection";
import type { RemoteConnectionOptions } from "@shared/appTypes";

export interface RemoteWorkspaceSetupProps {
  options: RemoteConnectionOptions;
  installing: boolean;
  onInstall: () => Promise<void>;
}

export interface RemoteWorkspaceFormProps {
  connection: ReturnType<typeof useRemoteWorkspaceConnection>;
}
