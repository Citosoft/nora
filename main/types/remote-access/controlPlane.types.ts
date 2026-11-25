import type { AccountSession } from "@main/types/account/session.types";
import type { SendPushRequest, SendPushResponse } from "@shared/types/remote-access/push.types";
import type { ProvisionRuntimeRequest, ProvisionRuntimeResponse, RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";

export interface RemoteControlPlane {
  provision(session: AccountSession, input: ProvisionRuntimeRequest, signal: AbortSignal): Promise<ProvisionRuntimeResponse>;
  rename(session: AccountSession, installationId: string, name: string, signal: AbortSignal): Promise<RuntimeDirectoryEntry>;
  rotate(session: AccountSession, installationId: string, signal: AbortSignal): Promise<ProvisionRuntimeResponse>;
  remove(session: AccountSession, installationId: string, signal: AbortSignal): Promise<void>;
  /** Asks the control plane to push to the account's phones on behalf of this installation. */
  sendPush(session: AccountSession, input: SendPushRequest, signal: AbortSignal): Promise<SendPushResponse>;
}
export interface ControlPlaneOptions {
  origin: string;
  fetch: typeof fetch;
  sessionToken(session: AccountSession, signal: AbortSignal): Promise<string>;
}
