import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { GenerateThreadName } from "./naming.types";
import type { ExecutionFailure } from "@shared/types/conversation/contracts.types";
import type { ExecutionStore, ExecutionEffect } from "./store.types";
import type { OwnershipStore, ExecutionOwner } from "./ownership.types";
import type { ExecutionProvider, ProviderResolver } from "./provider.types";
import type { WorkspaceAuthority } from "./workspace.types";
import type { WorkspaceReviewer } from "./review.types";
import type { TurnCheckpoints } from "./checkpoints.types";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import type { IdleCompactionMode } from "@shared/types/personalization/compaction.types";
import type { ThreadPreferences } from "@shared/types/personalization/threads.types";
import type { WriteThreadReference } from "./threadReferences.types";

export interface ProviderSupervisor extends ProviderResolver {
  /** Registers a provider found after startup; returns false when that kind and instance is already registered. */
  adopt(provider: ExecutionProvider): boolean;
  close(): Promise<void>;
}
export interface HostDependencies {
  writeThreadReference?: WriteThreadReference;
  threadPreferences?: () => ThreadPreferences;
  idleCompactionMode?: () => IdleCompactionMode;
  generateThreadName?: GenerateThreadName;
  roleForWorkspace?: (workspaceId: string) => RoleSelection | null;
  /** Resolves a bot from the workspace's effective catalog when a thread is created with one. */
  botForWorkspace?: (workspaceId: string, botId: string) => BotDefinition | null;
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
