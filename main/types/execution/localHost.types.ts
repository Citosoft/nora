import type { NoraRunContextResolver } from "@main/types/nora-tools/noraTools.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { GenerateThreadName } from "./naming.types";
import type { CodexOptions } from "./codex.types";
import type { ClaudeOptions, ClaudeRuntimeOptions } from "./claude.types";
import type { AcpOptions } from "./acp.types";
import type { ExecutionFailure } from "@shared/types/conversation/contracts.types";
import type { WorkspaceRegistration } from "./workspace.types";
import type { RoleSelection } from "@shared/types/personalization/roles.types";
import type { IdleCompactionMode } from "@shared/types/personalization/compaction.types";
import type { ThreadPreferences } from "@shared/types/personalization/threads.types";

export type NativeInstance =
  | { kind: "codex"; options: Omit<CodexOptions, "now"> }
  | { kind: "claude"; instanceId: string; runtime: ClaudeRuntimeOptions; policies: ClaudeOptions["policies"] }
  | { kind: "acp"; options: Omit<AcpOptions, "now"> };
export interface LocalHostOptions {
  threadPreferences?: () => ThreadPreferences;
  idleCompactionMode?: () => IdleCompactionMode;
  generateThreadName?: GenerateThreadName;
  roleForWorkspace?: (workspaceId: string) => RoleSelection | null;
  /** Resolves a bot from the workspace's effective catalog when a thread is created with one. */
  botForWorkspace?: (workspaceId: string, botId: string) => BotDefinition | null;
  databasePath: string;
  environmentId: string;
  gitExecutable: string;
  registrations: () => readonly WorkspaceRegistration[];
  instances: readonly NativeInstance[];
  runContext?: NoraRunContextResolver;
  onFailure: (failure: ExecutionFailure) => void;
  effectConcurrency?: number;
  shutdownGraceMs?: number;
}
