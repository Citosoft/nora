import type { BotDefinition, BotSnapshot } from "@shared/types/bots/bots.types";
import type { StartLoopRunPayload } from "@shared/appTypes";
import type { LoopRunOutputUpdate } from "@shared/ipc/types/loopGateway.types";
import type {
  LoopDefinition,
  LoopRoleDefinition,
  LoopRunRole,
  LoopRun,
  ReportLoopStagePayload,
  SaveLoopDefinitionPayload
} from "@shared/appTypes";
import type { LoopStore } from "./loopStore.types";
import type { PreparedLoopRunWorktree, PrepareLoopRunWorktreeInput } from "./prepareLoopRunWorktree.types";

export interface LoopStageResult {
  outcome: import("@shared/appTypes").LoopRoleOutcome;
  summary: string;
}

export interface LoopRunnerDeps {
  store: LoopStore;
  runtime: LoopThreadRuntime;
  resolveBot?: (projectId: string, botId: string) => BotDefinition | null;
  nowIso: () => string;
  randomId: () => string;
  prepareWorktree: (input: PrepareLoopRunWorktreeInput) => Promise<PreparedLoopRunWorktree>;
  notifyRunChanged: (run: LoopRun) => void;
  notifyRunOutput: (payload: LoopRunOutputUpdate) => void;
  /** Saves can come from the window or Nora's tools, so every save is broadcast for the Workflows tool to pick up. */
  notifyDefinitionChanged: (definition: LoopDefinition) => void;
  resolveWorkspaceStatePath: (projectId: string, relativePath: string) => Promise<string>;
}

export interface LoopRunner {
  listDefinitions: (projectId: string) => Promise<LoopDefinition[]>;
  reportStage(payload: ReportLoopStagePayload): Promise<void>;
  saveDefinition: (payload: SaveLoopDefinitionPayload) => Promise<LoopDefinition>;
  deleteDefinition: (projectId: string, definitionId: string) => Promise<void>;
  listRuns: (projectId: string) => Promise<LoopRun[]>;
  getRun: (projectId: string, runId: string) => Promise<LoopRun | null>;
  deleteRun: (projectId: string, runId: string) => Promise<void>;
  startRun: (payload: StartLoopRunPayload) => Promise<LoopRun>;
  pauseRun: (projectId: string, runId: string) => Promise<LoopRun>;
  resumeRun: (projectId: string, runId: string) => Promise<LoopRun>;
  cancelRun: (projectId: string, runId: string) => Promise<LoopRun>;
  dispose: () => void;
}

export interface ResolvedLoopStage extends LoopRoleDefinition { botSnapshot?: BotSnapshot; }
export interface LoopThreadRuntime {
  prepare(run: LoopRun, signal: AbortSignal): Promise<LoopRunRole[]>;
  execute(input: { conversationId: string; prompt: string; timeoutMs: number; signal: AbortSignal; onOutput(text: string): void }): Promise<LoopThreadResult>;
}

export interface LoopThreadResult {
  status: "completed" | "failed" | "interrupted" | "timed-out";
  output: string;
  failure: string | null;
}

export interface LoopStageReport { attemptId: string; result: LoopStageResult | null; }
