import { assertGitProject } from "@shared/projectVersionControl";
import { parseCreateWorktreePayload } from "@shared/worktreeCreation";
import type { AppState, CreateWorktreePayload } from "@shared/appTypes";
import type { CreateWorkspaceWorktreeDeps } from "@main/types/createWorkspaceWorktree.types";

/** Creates an unoccupied checkout, without invoking any thread, agent or terminal launch flow. */
export async function createWorkspaceWorktree(payload: CreateWorktreePayload, deps: CreateWorkspaceWorktreeDeps): Promise<AppState> {
  const { projectId, branch } = parseCreateWorktreePayload(payload);
  const before = deps.getSnapshot();
  const project = before.project;
  if (!project || project.id !== projectId) throw new Error("The selected workspace is no longer active. Reopen New worktree and try again.");
  assertGitProject(project);
  if (before.worktrees.some((worktree) => worktree.projectId === projectId && worktree.branch === branch)) throw new Error("A worktree already uses that branch. Choose a new branch name.");
  await deps.validateBranch(project, branch);
  const session = before.sessions.find((entry) => entry.projectId === projectId && entry.id === before.currentSessionId)
    ?? before.sessions.find((entry) => entry.projectId === projectId)
    ?? (await deps.worktrees.createInitialSessionState(project)).session;
  const planned = { ...deps.worktrees.planManagedWorktree(project, session, branch), branch };
  const worktree = await deps.worktrees.createWorktree(project, session, branch, planned);
  deps.updateState((state) => {
    const liveSession = state.sessions.find((entry) => entry.id === session.id) ?? session;
    const sessions = deps.worktrees.upsertSession(state.sessions, liveSession);
    const worktrees = deps.worktrees.upsertWorktree(state.worktrees, worktree);
    return { ...state, sessions, worktrees, currentSessionId: state.currentSessionId ?? session.id,
      workspaces: deps.worktrees.upsertWorkspaceSummary(state.workspaces, { project, sessions, worktrees,
        agents: state.agents.filter((entry) => entry.projectId === projectId), terminals: state.terminals.filter((entry) => entry.projectId === projectId) }) };
  });
  await deps.persistWorkspaceState(deps.getSnapshot());
  return deps.refreshProjectState();
}
