import type { ForgeBranchPullRequestStatus, CreateTerminalPayload, WorktreeRecord, WorkspaceSummary } from "@shared/appTypes";

export type WorkspaceWorktreeActionsMenuItemsProps = {
  workspace: WorkspaceSummary;
  worktree: WorktreeRecord;
  preferredShellId: string | null;
  pullRequestStatus: ForgeBranchPullRequestStatus | null;
  isRootWorktree: boolean;
  onItemSelected?: () => void;
  onFocusWorktree: () => void;
  onOpenCreateAgentOnWorktree: (projectId: string, worktreeId: string) => void;
  onOpenCreateTerminalOnWorktree: (projectId: string, worktreeId: string) => void;
  onLaunchQuickTerminalOnWorktree: (projectId: string, worktreeId: string) => void;
  onLaunchWorktreeScript: (projectId: string, payload: CreateTerminalPayload) => void;
  onRemoveWorktree: (projectId: string, worktreeId: string, branch: string) => void;
  onOpenPullRequest: (projectId: string, url: string) => void;
};
