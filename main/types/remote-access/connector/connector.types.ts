import type { RemoteAccessStatus } from "@shared/types/remote-access/remoteAccess.types";

export interface ConnectorAsset {
  name: string;
  sha256: string;
  archive: boolean;
}
export interface ConnectorInstallOptions {
  directory: string;
  platform: NodeJS.Platform;
  arch: string;
  fetch: typeof fetch;
}
export interface ConnectorHandle { stop(): Promise<void>; }
export interface ConnectorStartOptions {
  token: string;
  signal: AbortSignal;
  onStatus(status: RemoteAccessStatus): void;
}
export interface RemoteConnector {
  start(options: ConnectorStartOptions): Promise<ConnectorHandle>;
}
export interface ConnectorOptions extends ConnectorInstallOptions {
  env: NodeJS.ProcessEnv;
}
