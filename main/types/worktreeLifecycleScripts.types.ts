import type {
  ProjectSummary,
  WorktreeLifecycleScriptTrigger,
  WorktreeRecord,
  WorktreeScriptRunReport
} from "@shared/appTypes";
import type { WorkspaceTarget } from "./internal.types";

export type WorktreeLifecycleScriptRunnerDeps = {
  /** Runs one command line to completion in the target directory, rejecting when it exits non-zero. */
  runCommand: (target: WorkspaceTarget, command: string) => Promise<void>;
  getWorktreeTarget: (project: ProjectSummary, worktree: Pick<WorktreeRecord, "path" | "location">) => WorkspaceTarget;
  /** Shows a failed script to the user; never allowed to block the worktree flow that ran it. */
  reportFailure: (message: string) => void;
};

export type RunWorktreeLifecycleScripts = (
  project: ProjectSummary,
  worktree: Pick<WorktreeRecord, "path" | "location" | "branch">,
  trigger: WorktreeLifecycleScriptTrigger
) => Promise<WorktreeScriptRunReport>;
