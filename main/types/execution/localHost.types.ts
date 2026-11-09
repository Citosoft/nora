import type { CodexOptions } from "./codex.types";
import type { ClaudeOptions, ClaudeRuntimeOptions } from "./claude.types";
import type { ExecutionFailure } from "@shared/types/conversation/contracts.types";
import type { WorkspaceRegistration } from "./workspace.types";

export type NativeInstance =
  | { kind: "codex"; options: Omit<CodexOptions, "now"> }
  | { kind: "claude"; instanceId: string; runtime: ClaudeRuntimeOptions; policies: ClaudeOptions["policies"] };
export interface LocalHostOptions {
  databasePath: string;
  environmentId: string;
  gitExecutable: string;
  registrations: () => readonly WorkspaceRegistration[];
  instances: readonly NativeInstance[];
  onFailure: (failure: ExecutionFailure) => void;
  effectConcurrency?: number;
  shutdownGraceMs?: number;
}
