import type { AppState, WorktreeRecord } from "@shared/appTypes";
import type { WorktreeCheckoutSyncDeps } from "@main/types/worktreeCheckoutSync.types";

/** Ready worktree paths per local project, from the open project's live list or each workspace summary. */
export function readyWorktreePaths(state: AppState, projectId: string): string[] {
  const worktrees = state.project?.id === projectId ? state.worktrees
    : state.workspaces.find((workspace) => workspace.project.id === projectId)?.worktrees ?? [];
  return sortedReadyPaths(worktrees);
}

function sortedReadyPaths(worktrees: WorktreeRecord[]): string[] {
  return worktrees.filter((worktree) => worktree.status === "ready").map((worktree) => worktree.path).sort();
}

/**
 * Keeps each project's thread checkouts in step with its worktrees. State changes arrive often, so a project is only
 * re-synced when its list of ready worktree paths changes; a failed sync is retried on the next change.
 */
export function createWorktreeCheckoutSync(deps: WorktreeCheckoutSyncDeps): (state: AppState) => void {
  const synced = new Map<string, { signature: string }>();
  const signatures = new WeakMap<WorktreeRecord[], string>();
  let lastInputs: Pick<AppState, "project" | "worktrees" | "workspaces"> | null = null;

  const syncProject = (id: string, worktrees: WorktreeRecord[]): void => {
    let signature = signatures.get(worktrees);
    if (signature === undefined) {
      signature = JSON.stringify(sortedReadyPaths(worktrees));
      signatures.set(worktrees, signature);
    }
    if (synced.get(id)?.signature === signature) return;
    const attempt = { signature };
    synced.set(id, attempt);
    void deps.sync(id).catch((error: unknown) => {
      if (synced.get(id) === attempt) {
        synced.delete(id);
        lastInputs = null;
      }
      deps.onError(error);
    });
  };
  return ({ project, worktrees, workspaces }) => {
    if (lastInputs && lastInputs.project === project && lastInputs.worktrees === worktrees && lastInputs.workspaces === workspaces) return;
    lastInputs = { project, worktrees, workspaces };
    if (project && project.location?.kind !== "ssh") syncProject(project.id, worktrees);
    for (const workspace of workspaces) {
      if (workspace.project.id !== project?.id && workspace.project.location?.kind !== "ssh") syncProject(workspace.project.id, workspace.worktrees);
    }
  };
}
