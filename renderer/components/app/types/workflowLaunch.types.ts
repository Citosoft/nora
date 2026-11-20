import type { ReactNode } from "react";
import type { LoopDefinition } from "@shared/appTypes";
import type { LoopRunGoalKind } from "./loopDesigner.types";
import type { LoopLimitsDraft } from "@shared/loopLimits";

/** The task a workflow run is launched for; the title names the run's worktree branch. */
export interface WorkflowRunTask { path: string; title: string; }

/** Asks the Workflows tool to open run setup for a saved workflow prefilled with a task, or the monitor of one run. */
export type WorkflowToolRequest =
  | { kind: "setup"; projectId: string; definitionId: string; task: WorkflowRunTask; revision: number }
  | { kind: "monitor"; projectId: string; runId: string; revision: number };

export interface WorkflowLaunchValue {
  request: WorkflowToolRequest | null;
  /** Opens the Workflows tool on run setup for this workflow and task. */
  runTaskWorkflow(projectId: string, definitionId: string, task: WorkflowRunTask): void;
  /** Opens the Workflows tool on one run's monitor, for example from the inbox. */
  openRun(projectId: string, runId: string): void;
  /** Called by the Workflows tool once it has acted on a request, so a later mount never replays it. */
  settleRequest(revision: number): void;
}
export interface WorkflowLaunchProviderProps { children: ReactNode; }

/** Run setup's starting goal, limits and branch: blank for a plain run, the task template when launched from a task. */
export interface LoopRunSetupDefaults {
  templateId: string;
  goalKind: LoopRunGoalKind;
  selectedTaskPath: string;
  objective: string;
  limitsDraft: LoopLimitsDraft;
  branchName: string;
}

export interface LoopDefinitionList { definitions: LoopDefinition[]; isLoading: boolean; errorMessage: string | null; }
