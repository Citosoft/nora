import type { LaunchTargetMode } from "@/components/app/types/component.types";
import type { CreateAgentPayload, WorktreeRecord, WorktreeTarget } from "@shared/appTypes";

function hasAvailableExistingWorktree(worktrees: Array<Pick<WorktreeRecord, "id">>): boolean {
  return worktrees.length > 0;
}

function hasAvailableProjectBranches(projectBranches: string[]): boolean {
  return projectBranches.length > 0;
}

export function resolveSupportedLaunchTargetMode(
  preferredMode: LaunchTargetMode,
  worktrees: Array<Pick<WorktreeRecord, "id">>,
  projectBranches: string[]
): LaunchTargetMode {
  if (preferredMode === "existing" && !hasAvailableExistingWorktree(worktrees)) {
    return "current-branch";
  }

  if (preferredMode === "branch-existing" && !hasAvailableProjectBranches(projectBranches)) {
    return "current-branch";
  }

  return preferredMode;
}

export function launchTargetModeFromTarget(target: WorktreeTarget): LaunchTargetMode {
  if (target.kind === "existing") {
    return "existing";
  }

  if (target.kind === "new") {
    return "new";
  }

  return "current-branch";
}

export function createLaunchTargetFormState(
  mode: LaunchTargetMode,
  worktrees: Array<Pick<WorktreeRecord, "id">>,
  projectBranches: string[],
  previousPrepareWorktree?: boolean
): Pick<CreateAgentPayload, "target" | "branchCheckout" | "prepareWorktree"> {
  const target: WorktreeTarget =
    mode === "current-branch"
      ? { kind: "root" }
      : mode === "new"
        ? { kind: "new" }
        : mode === "existing"
          ? { kind: "existing", worktreeId: worktrees[0]?.id ?? "" }
          : { kind: "root" };

  const branchCheckout: CreateAgentPayload["branchCheckout"] =
    mode === "branch-existing"
      ? {
          mode: "existing",
          branchName: projectBranches[0] ?? ""
        }
      : mode === "branch-new"
        ? {
            mode: "new",
            branchName: ""
          }
        : null;

  return {
    target,
    branchCheckout,
    prepareWorktree: mode === "new" ? previousPrepareWorktree : false
  };
}
