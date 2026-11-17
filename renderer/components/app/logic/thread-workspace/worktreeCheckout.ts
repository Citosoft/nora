import type { AppState } from "@shared/appTypes";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { CreateThreadWorktreeDeps } from "@/components/app/types/thread-workspace/worktreeCheckout.types";

/**
 * Creates a worktree for a new thread and returns its registered checkout. Creation updates the project's worktrees; the
 * explicit sync then registers the new folder before the thread is pointed at it.
 */
export async function createThreadWorktree(projectId: string, branch: string, deps: CreateThreadWorktreeDeps): Promise<WorkspaceRef> {
  const name = branch.trim();
  if (!name) throw new Error("Enter a branch name for the new worktree.");
  const state: AppState = await deps.createWorktree({ projectId, branch: name });
  const worktree = state.worktrees.find((entry) => entry.projectId === projectId && entry.branch === name);
  if (!worktree) throw new Error("The worktree was not created. Try again from the Worktrees tool.");
  const boot: NativeBoot = await deps.syncCheckouts(projectId);
  const checkouts = boot.workspaces.find((entry) => entry.shellProjectId === projectId)?.checkouts ?? [];
  const checkout = checkouts.find((entry) => entry.path === worktree.path) ?? checkouts.find((entry) => entry.branch === name);
  if (!checkout) throw new Error("The worktree was created but isn't ready for threads yet. Pick it from the list in a moment.");
  return checkout;
}
