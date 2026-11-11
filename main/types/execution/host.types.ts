import type { GenerateThreadName } from "./naming.types";
import type { ExecutionFailure } from "@shared/types/conversation/contracts.types";
import type { ExecutionStore, ExecutionEffect } from "./store.types";
import type { OwnershipStore, ExecutionOwner } from "./ownership.types";
import type { ProviderResolver } from "./provider.types";
import type { WorkspaceAuthority } from "./workspace.types";
import type { WorkspaceReviewer } from "./review.types";
import type { TurnCheckpoints } from "./checkpoints.types";
import type { RoleSelection } from "@shared/types/personalization/roles.types";

export interface ProviderSupervisor extends ProviderResolver { close(): Promise<void> }
export interface HostDependencies {
  generateThreadName?: GenerateThreadName;
  roleForWorkspace?: (workspaceId: string) => RoleSelection | null;
  store: ExecutionStore & OwnershipStore;
  providers: ProviderSupervisor;
  workspaces: WorkspaceAuthority;
  reviewer?: WorkspaceReviewer;
  checkpoints?: TurnCheckpoints;
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
