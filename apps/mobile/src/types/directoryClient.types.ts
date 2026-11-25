import type { RuntimeDirectoryEntry } from "@shared/types/remote-access/directory.types";
import type { PushDeviceEntry, RegisterPushDeviceRequest } from "@shared/types/remote-access/push.types";
import type { FetchLike, TokenProvider } from "./http.types";

export interface DirectoryClientConfig {
  baseUrl: string;
  getToken: TokenProvider;
  fetch: FetchLike;
  timeoutMs: number;
}

/** The control-plane Worker: runtime discovery, housekeeping and phone push registration, never conversation traffic. */
export interface DirectoryClient {
  list(): Promise<RuntimeDirectoryEntry[]>;
  rename(installationId: string, name: string): Promise<RuntimeDirectoryEntry>;
  /** Unlinks the computer from the account; it stops being reachable from the web app until re-enabled. */
  remove(installationId: string): Promise<void>;
  /** Registers or refreshes this phone's Expo push token under the signed-in account. */
  registerPushDevice(request: RegisterPushDeviceRequest): Promise<PushDeviceEntry>;
  /** Stops pushes to this phone; rejects with `not-found` when it was not registered. */
  removePushDevice(deviceId: string): Promise<void>;
}
