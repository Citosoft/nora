import type { ExecutionFailure } from "@shared/types/conversation/contracts.types";
import type { ExecutionStore, ExecutionEffect } from "./store.types";
import type { OwnershipStore, ExecutionOwner } from "./ownership.types";
import type { ProviderResolver } from "./provider.types";
import type { WorkspaceAuthority } from "./workspace.types";

export interface ProviderSupervisor extends ProviderResolver { close(): Promise<void> }
export interface HostDependencies {
  store: ExecutionStore & OwnershipStore;
  providers: ProviderSupervisor;
  workspaces: WorkspaceAuthority;
  owner: ExecutionOwner;
  isProcessAlive: (processId: number) => boolean;
  now: () => string;
  nextId: () => string;
  onFailure: (failure: ExecutionFailure) => void;
  effectConcurrency?: number;
  shutdownGraceMs?: number;
}
export type HostLifecycle = "idle" | "running" | "stopping" | "faulted" | "stopped";
export interface WorkerGroup {
  kinds: readonly ExecutionEffect["action"]["kind"][];
  operations: Set<Promise<void>>;
  controls: boolean;
}
