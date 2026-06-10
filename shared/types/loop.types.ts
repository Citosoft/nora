import type { AgentPromptSource } from "./agentContext.types";
import type { AgentMode } from "./system.types";
import type { WorktreeTarget } from "./session.types";
import type { LoopOutputEvent } from "./loopOutput.types";

export type LoopRoleKind = "writer" | "reviewer";

export interface LoopRoleDefinition {
  id: string;
  kind: LoopRoleKind;
  name: string;
  toolId: string;
  instructions: string;
}

export interface LoopLimits {
  maxIterations: number;
  maxDurationMs: number;
  roleTimeoutMs: number;
}

export interface LoopDefinition {
  id: string;
  projectId: string;
  name: string;
  writer: LoopRoleDefinition;
  reviewers: LoopRoleDefinition[];
  limits: LoopLimits;
  createdAt: string;
  updatedAt: string;
}

export type LoopRunStatus = "preparing" | "running" | "pausing" | "paused" | "completed" | "cancelled";
export type LoopRoleOutcome = "continue" | "complete" | "approve" | "changes_requested";

export interface LoopRunRole {
  roleId: string;
  kind: LoopRoleKind;
  name: string;
  toolId: string;
  instructions: string;
}

export interface LoopRoleResult {
  roleId: string;
  outcome: LoopRoleOutcome;
  summary: string;
  completedAt: string;
}

export interface LoopIteration {
  number: number;
  startedAt: string;
  completedAt: string | null;
  writerResult: LoopRoleResult | null;
  reviewerResults: LoopRoleResult[];
}

export type LoopRunEventKind = "created" | "role_started" | "role_finished" | "paused" | "resumed" | "completed" | "cancelled" | "error";

export interface LoopRunEvent {
  id: string;
  kind: LoopRunEventKind;
  createdAt: string;
  message: string;
  roleId: string | null;
  iteration: number | null;
}

export interface LoopRun {
  id: string;
  projectId: string;
  definitionId: string;
  definition: LoopDefinition;
  objective: string;
  specPath: string | null;
  taskPath: string | null;
  handoffPath: string | null;
  limits: LoopLimits;
  status: LoopRunStatus;
  stopReason: string | null;
  sessionId: string | null;
  worktreeId: string | null;
  worktreePath: string | null;
  outputLog: string;
  outputEvents: LoopOutputEvent[];
  roles: LoopRunRole[];
  iterations: LoopIteration[];
  events: LoopRunEvent[];
  activeRoleId: string | null;
  activeToken: string | null;
  createdAt: string;
  startedAt: string | null;
  updatedAt: string;
  completedAt: string | null;
}

export interface SaveLoopDefinitionPayload {
  projectId: string;
  definition: Omit<LoopDefinition, "projectId" | "createdAt" | "updatedAt"> & Partial<Pick<LoopDefinition, "createdAt">>;
}

export interface StartLoopRunPayload {
  projectId: string;
  definitionId: string;
  objective: string;
  specPath?: string | null;
  taskPath?: string | null;
  handoffPath?: string | null;
  limits?: LoopLimits;
  target: WorktreeTarget;
  branchCheckout?: { mode: "existing" | "new"; branchName: string } | null;
  worktreeBranch?: { prefix: string; name: string } | null;
  prepareWorktree?: boolean;
  prepareCommand?: string;
  launchSource?: AgentPromptSource;
}

export interface LoopManagedAgent {
  agentId: string;
  mode: AgentMode;
  runId: string;
}
