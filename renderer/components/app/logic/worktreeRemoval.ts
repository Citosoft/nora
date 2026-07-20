import type {
  RemovableWorktree,
  WorktreeRemovalWorkspace
} from "@/components/app/types/worktreeRemoval.types";

export function canRemoveWorkspaceWorktree(
  workspace: WorktreeRemovalWorkspace,
  worktree: RemovableWorktree,
  isRootWorktree: boolean
): boolean {
  if (isRootWorktree || worktree.status === "removing") {
    return false;
  }

  const hasAttachedAgent = workspace.agents.some((agent) => agent.worktreeId === worktree.id);
  const hasAttachedTerminal = workspace.terminals.some((terminal) => terminal.worktreeId === worktree.id);
  return !hasAttachedAgent && !hasAttachedTerminal;
}
