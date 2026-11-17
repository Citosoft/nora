import type { AccountSession } from "@main/types/account/session.types";
import type { ProvisionRuntimeRequest, ProvisionRuntimeResponse, RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";

export interface RemoteControlPlane {
  provision(session: AccountSession, input: ProvisionRuntimeRequest, signal: AbortSignal): Promise<ProvisionRuntimeResponse>;
  rename(session: AccountSession, installationId: string, name: string, signal: AbortSignal): Promise<RuntimeDirectoryEntry>;
  rotate(session: AccountSession, installationId: string, signal: AbortSignal): Promise<ProvisionRuntimeResponse>;
  remove(session: AccountSession, installationId: string, signal: AbortSignal): Promise<void>;
}
export interface ControlPlaneOptions {
  origin: string;
  fetch: typeof fetch;
  sessionToken(session: AccountSession, signal: AbortSignal): Promise<string>;
}
