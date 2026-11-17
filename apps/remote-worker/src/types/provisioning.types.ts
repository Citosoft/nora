import type {
  ProvisionRuntimeRequest,
  ProvisionRuntimeResponse,
  RuntimeDirectoryEntry
} from "@shared/types/remote-access/directory.types";
import type { CloudflareTunnel, TunnelProvider } from "./cloudflare.types";
import type { RuntimeDirectoryStore } from "./directoryStore.types";

export interface Clock {
  now(): Date;
}

export interface RandomSource {
  bytes(length: number): Uint8Array;
}

export interface ProvisioningServiceDeps {
  readonly store: RuntimeDirectoryStore;
  readonly tunnels: TunnelProvider;
  readonly clock: Clock;
  readonly random: RandomSource;
  readonly hostnameSecret: string;
  readonly hostnameSuffix: string;
  readonly maxRuntimesPerUser: number;
}

export interface ProvisioningService {
  provision(userId: string, request: ProvisionRuntimeRequest): Promise<ProvisionRuntimeResponse>;
  list(userId: string): Promise<readonly RuntimeDirectoryEntry[]>;
  rename(userId: string, installationId: string, name: string): Promise<RuntimeDirectoryEntry>;
  remove(userId: string, installationId: string): Promise<void>;
  rotate(userId: string, installationId: string): Promise<ProvisionRuntimeResponse>;
}

export interface EnsureTunnelRequest {
  /** Tunnel ID from the caller's own directory entry, if any. */
  readonly knownTunnelId: string | null;
  /** Deterministic per (user, installation) so an orphaned tunnel can be found again. */
  readonly tunnelName: string;
}

export interface EnsuredTunnel {
  readonly tunnel: CloudflareTunnel;
  /** True only when this call created the tunnel, i.e. it owns cleanup if later steps fail. */
  readonly created: boolean;
}
