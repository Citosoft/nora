import type { AppState } from "@shared/appTypes";
import type { WorktreeCheckoutSyncDeps } from "@main/types/worktreeCheckoutSync.types";

/** Ready worktree paths per local project, from the open project's live list or each workspace summary. */
export function readyWorktreePaths(state: AppState, projectId: string): string[] {
  const worktrees = state.project?.id === projectId ? state.worktrees
    : state.workspaces.find((workspace) => workspace.project.id === projectId)?.worktrees ?? [];
  return worktrees.filter((worktree) => worktree.status === "ready").map((worktree) => worktree.path).sort();
}

function localProjectIds(state: AppState): string[] {
  const projects = [...(state.project ? [state.project] : []), ...state.workspaces.map((workspace) => workspace.project)];
  return [...new Set(projects.filter((project) => project.location?.kind !== "ssh").map((project) => project.id))];
}

/**
 * Keeps each project's thread checkouts in step with its worktrees. State changes arrive often, so a project is only
 * re-synced when its list of ready worktree paths changes; a failed sync is retried on the next change.
 */
export function createWorktreeCheckoutSync(deps: WorktreeCheckoutSyncDeps): (state: AppState) => void {
  const synced = new Map<string, string>();
  return (state) => {
    for (const projectId of localProjectIds(state)) {
      const signature = readyWorktreePaths(state, projectId).join("\n");
      if (synced.get(projectId) === signature) continue;
      synced.set(projectId, signature);
      void deps.sync(projectId).catch((error: unknown) => {
        synced.delete(projectId);
        deps.onError(error);
      });
    }
  };
}
