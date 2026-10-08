import type { LaunchTargetAvailability, LaunchTargetMode } from "@/components/app/types/chromeDialog.types";
import type { CreateAgentPayload, WorktreeRecord, WorktreeTarget } from "@shared/appTypes";

export function resolveSupportedLaunchTargetMode(
  preferredMode: LaunchTargetMode,
  { worktrees, projectBranches, isGitProject }: LaunchTargetAvailability
): LaunchTargetMode {
  if (!isGitProject) {
    return "current-branch";
  }

  if (preferredMode === "existing" && !worktrees.length) {
    return "current-branch";
  }

  if (preferredMode === "branch-existing" && !projectBranches.length) {
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
