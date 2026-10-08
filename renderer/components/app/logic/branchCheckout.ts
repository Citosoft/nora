import type { BranchCheckoutBlockers } from "@/components/app/types/branchCheckout.types";

/** Local branches the user can switch to: everything except the one already checked out, sorted. */
export function getCheckoutableBranches(projectBranches: readonly string[], activeBranch: string | null): string[] {
  return projectBranches
    .filter((branch) => branch.trim() && branch !== activeBranch)
    .sort((left, right) => left.localeCompare(right));
}

/** Why a branch switch is not allowed right now, or null when it is. */
export function getBranchCheckoutBlockedReason({
  isInspectingCommit = false,
  hasUncommittedChanges,
  checkoutableBranchCount
}: BranchCheckoutBlockers): string | null {
  if (isInspectingCommit) {
    return "Return to working tree before switching branches";
  }
  if (hasUncommittedChanges) {
    return "Commit or discard changes before switching branches";
  }
  if (checkoutableBranchCount === 0) {
    return "No other local branches are available";
  }
  return null;
}
