import {
  describeWorkspaceSetupScriptError,
  formatWorktreeScriptFailureMessage,
  selectWorkspaceSetupScriptsForTrigger
} from "@shared/workspaceSetupScripts";
import type {
  RunWorktreeLifecycleScripts,
  WorktreeLifecycleScriptRunnerDeps
} from "@main/types/worktreeLifecycleScripts.types";

/**
 * Runs a workspace's setup scripts for one worktree lifecycle moment, in order, inside the worktree.
 * The first failing script stops the rest (later steps usually depend on earlier ones) and is
 * reported to the user, but the outcome never throws: worktree creation and removal carry on.
 */
export function createWorktreeLifecycleScriptRunner(deps: WorktreeLifecycleScriptRunnerDeps): RunWorktreeLifecycleScripts {
  return async (project, worktree, trigger) => {
    const scripts = selectWorkspaceSetupScriptsForTrigger(project.workspaceSetupScripts, trigger);
    if (!scripts.length) {
      return { kind: "none" };
    }
    const target = deps.getWorktreeTarget(project, worktree);
    for (const script of scripts) {
      try {
        await deps.runCommand(target, script.command);
      } catch (error) {
        const message = formatWorktreeScriptFailureMessage(script, trigger, worktree.branch, describeWorkspaceSetupScriptError(error));
        deps.reportFailure(message);
        return { kind: "failed", trigger, script, message };
      }
    }
    return { kind: "succeeded", scriptCount: scripts.length };
  };
}
