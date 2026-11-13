import type { ForgeBranchChanges } from "@shared/appTypes";

export interface DiffLineTotals {
  files: number;
  additions: number;
  deletions: number;
}

export interface GitBaseBranch {
  /** Branch name a change request targets. */
  branch: string;
  /** Ref the diff is measured against, preferring the remote-tracking copy. */
  ref: string;
}

/** Git-only portion of a branch summary; the forge layer adds the remote provider. */
export type GitBranchChanges = Omit<ForgeBranchChanges, "provider">;

/** Where a checkout's branch is compared from; `mergeBase` is null when it shares no history with a base branch. */
export interface GitBranchComparison {
  branch: string;
  base: GitBaseBranch | null;
  mergeBase: string | null;
}
