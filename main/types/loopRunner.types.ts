import type { AppState, StartLoopRunPayload } from "@shared/appTypes";
import type { LoopRunOutputUpdate } from "@shared/ipc/types/loopGateway.types";
import type {
  LoopDefinition,
  LoopRun,
  SaveLoopDefinitionPayload
} from "@shared/appTypes";
import type { LoopStore } from "./loopStore.types";
import type { LoopHeadlessExecutor } from "./loopHeadlessExecutor.types";
import type { PreparedLoopRunWorktree, PrepareLoopRunWorktreeInput } from "./prepareLoopRunWorktree.types";

export interface ParsedLoopResult {
  outcome: import("@shared/appTypes").LoopRoleOutcome;
  summary: string;
}

export interface LoopRunnerDeps {
  store: LoopStore;
  nowIso: () => string;
  randomId: () => string;
  getSnapshot: () => AppState;
  prepareWorktree: (input: PrepareLoopRunWorktreeInput) => Promise<PreparedLoopRunWorktree>;
  resolveLoopTool: (toolId: string) => { detectedCommand: string; env: Record<string, string> };
  headlessExecutor: LoopHeadlessExecutor;
  notifyRunChanged: (run: LoopRun) => void;
  notifyRunOutput: (payload: LoopRunOutputUpdate) => void;
  resolveWorkspaceStatePath: (projectId: string, relativePath: string) => Promise<string>;
}

export interface LoopRunner {
  listDefinitions: (projectId: string) => Promise<LoopDefinition[]>;
  saveDefinition: (payload: SaveLoopDefinitionPayload) => Promise<LoopDefinition>;
  deleteDefinition: (projectId: string, definitionId: string) => Promise<void>;
  listRuns: (projectId: string) => Promise<LoopRun[]>;
  getRun: (projectId: string, runId: string) => Promise<LoopRun | null>;
  deleteRun: (projectId: string, runId: string) => Promise<void>;
  startRun: (payload: StartLoopRunPayload) => Promise<LoopRun>;
  pauseRun: (projectId: string, runId: string) => Promise<LoopRun>;
  resumeRun: (projectId: string, runId: string) => Promise<LoopRun>;
  cancelRun: (projectId: string, runId: string) => Promise<LoopRun>;
  getActiveRunForAgent: (agentId: string) => Promise<LoopRun | null>;
  dispose: () => void;
}
