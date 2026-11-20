import type { NoraWorkerWorkspaces, WorkerWorkspacesDeps } from "@main/types/nora-tools/workerWorkspaces.types";

/** Use the app's managed worktrees and register the checkout before a worker tries to acquire its write lease. */
export function createWorkerWorkspaces(deps: WorkerWorkspacesDeps): NoraWorkerWorkspaces {
  return {
    async isolate(workspace, title) {
      const entry = deps.boot().workspaces.find((candidate) => candidate.id === workspace.projectId);
      const projectId = entry?.shellProjectId;
      if (!projectId) throw new Error("This workspace has no managed worktrees. Open it as a project in Nora before starting an isolated worker.");
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "task";
      const branch = `nora/worker-${slug}-${deps.nextId().replace(/[^a-z0-9]/gi, "").slice(0, 10)}`;
      const state = await deps.createWorktree({ projectId, branch });
      const worktrees = state.project?.id === projectId ? state.worktrees
        : state.workspaces.find((candidate) => candidate.project.id === projectId)?.worktrees ?? [];
      const created = worktrees.find((candidate) => candidate.projectId === projectId && candidate.branch === branch && candidate.status === "ready");
      if (!created) throw new Error("The worker worktree was not created. Check the project's worktrees before retrying.");
      const boot = await deps.syncCheckouts(projectId);
      const checkout = boot.workspaces.find((candidate) => candidate.id === workspace.projectId)?.checkouts?.find((candidate) => candidate.path === created.path);
      if (!checkout) throw new Error("The worker worktree was created but is not registered yet. Refresh the workspace before retrying.");
      return { ...checkout, access: "write" };
    }
  };
}
