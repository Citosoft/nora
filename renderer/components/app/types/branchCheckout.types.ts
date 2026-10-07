export type BranchCheckoutBlockers = {
  isInspectingCommit?: boolean;
  hasUncommittedChanges: boolean;
  checkoutableBranchCount: number;
};

export type BranchCheckoutMenuProps = {
  activeBranch: string | null;
  checkoutableBranches: string[];
  blockedReason: string | null;
  isCheckingOut: boolean;
  onCheckout: (branch: string) => void;
  triggerClassName?: string;
};

export type SessionBranchCheckoutTarget = {
  projectId: string;
  workspace: string;
  branch: string;
};

export type SessionBranchCheckoutState = Pick<
  BranchCheckoutMenuProps,
  "activeBranch" | "checkoutableBranches" | "blockedReason" | "isCheckingOut" | "onCheckout"
> & {
  /** Re-reads the checkout's git status so the blocked reason reflects edits made since the last check. */
  refreshStatus: () => void;
};
