import type { AppState } from "./appTypes";

/**
 * Checkouts the Changes panel may show: the project checkout (its checked-out branch) first, then each ready worktree.
 * Shared so the main process validates exactly the choices the renderer offers.
 */
export function listChangesCheckoutPaths(state: Pick<AppState, "project" | "worktrees">): string[] {
  if (!state.project) return [];
  const worktreePaths = state.worktrees.filter((worktree) => worktree.status === "ready").map((worktree) => worktree.path);
  return [...new Set([state.project.rootPath, ...worktreePaths])];
}
