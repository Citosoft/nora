export const WORKTREE_BRANCH_PREFIX_OPTIONS = [
  { value: "loop", label: "Loop" },
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Bug" },
  { value: "chore", label: "Chore" },
  { value: "hotfix", label: "Hotfix" },
  { value: "docs", label: "Docs" }
] as const;

export const DEFAULT_LOOP_WORKTREE_BRANCH_PREFIX = "loop";
