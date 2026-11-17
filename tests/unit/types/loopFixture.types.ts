import type { LoopDefinition, LoopRoleOutcome } from "@shared/appTypes";
import type { LoopRunnerDeps, LoopThreadRuntime, LoopThreadResult } from "@main/types/loopRunner.types";
export interface LoopFixtureOptions {
  definition?: LoopDefinition;
  resolveBot?: LoopRunnerDeps["resolveBot"];
  execute?: (input: Parameters<LoopThreadRuntime["execute"]>[0]) => Promise<LoopFixtureResult>;
  prepare?: LoopThreadRuntime["prepare"];
  prepareWorktree?: LoopRunnerDeps["prepareWorktree"];
  nowIso?: LoopRunnerDeps["nowIso"];
}

export interface LoopFixtureResult extends LoopThreadResult {
  report?: { attemptId: string; outcome: LoopRoleOutcome; summary: string };
}
