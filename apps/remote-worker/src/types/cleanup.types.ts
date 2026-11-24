import type { RuntimeDirectoryStore, RuntimeDirectorySnapshot } from "./directoryStore.types";
import type { TunnelMaintenanceProvider } from "./cloudflare.types";

export interface AccountDirectory {
  readonly userId: string;
  readonly directory: RuntimeDirectorySnapshot;
}

export interface CleanupDeps {
  readonly inventory: () => Promise<readonly AccountDirectory[]>;
  readonly store: RuntimeDirectoryStore;
  readonly tunnels: TunnelMaintenanceProvider;
  readonly hostnameSuffix: string;
  readonly now: () => number;
}

export interface CleanupResult {
  scanned: number;
  removed: number;
  failed: number;
}
