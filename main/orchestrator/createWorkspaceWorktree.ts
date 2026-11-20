import { assertGitProject } from "@shared/projectVersionControl";
import { parseCreateWorktreePayload } from "@shared/worktreeCreation";
import type { AppState, CreateWorktreePayload } from "@shared/appTypes";
import type { CreateWorkspaceWorktreeDeps } from "@main/types/createWorkspaceWorktree.types";

/** Creates an unoccupied checkout, without invoking any thread, agent or terminal launch flow. */
export async function createWorkspaceWorktree(payload: CreateWorktreePayload, deps: CreateWorkspaceWorktreeDeps): Promise<AppState> {
  const { projectId, branch } = parseCreateWorktreePayload(payload);
  const before = deps.getSnapshot();
  const background = before.workspaces.find((entry) => entry.project.id === projectId);
  const active = before.project?.id === projectId;
  const project = active ? before.project : background?.project;
  if (!project) throw new Error("The selected workspace is no longer active. Reopen New worktree and try again.");
  assertGitProject(project);
  const existingWorktrees = active ? before.worktrees : background?.worktrees ?? [];
  const existingSessions = active ? before.sessions : background?.sessions ?? [];
  if (existingWorktrees.some((worktree) => worktree.projectId === projectId && worktree.branch === branch)) throw new Error("A worktree already uses that branch. Choose a new branch name.");
  await deps.validateBranch(project, branch);
  const session = existingSessions.find((entry) => entry.projectId === projectId && entry.id === before.currentSessionId)
    ?? existingSessions.find((entry) => entry.projectId === projectId)
    ?? (await deps.worktrees.createInitialSessionState(project)).session;
  const planned = { ...deps.worktrees.planManagedWorktree(project, session, branch), branch };
  const worktree = await deps.worktrees.createWorktree(project, session, branch, planned);
  deps.updateState((state) => {
    const current = state.project?.id === projectId;
    const workspace = state.workspaces.find((entry) => entry.project.id === projectId);
    const scopedSessions = current ? state.sessions : workspace?.sessions ?? existingSessions;
    const scopedWorktrees = current ? state.worktrees : workspace?.worktrees ?? existingWorktrees;
    const liveSession = scopedSessions.find((entry) => entry.id === session.id) ?? session;
    const sessions = deps.worktrees.upsertSession(scopedSessions, liveSession);
    const worktrees = deps.worktrees.upsertWorktree(scopedWorktrees, worktree);
    return { ...state, ...(current ? { sessions, worktrees, currentSessionId: state.currentSessionId ?? session.id } : {}),
      workspaces: deps.worktrees.upsertWorkspaceSummary(state.workspaces, { project, sessions, worktrees,
        agents: current ? state.agents.filter((entry) => entry.projectId === projectId) : workspace?.agents ?? [],
        terminals: current ? state.terminals.filter((entry) => entry.projectId === projectId) : workspace?.terminals ?? [] }) };
  });
  await deps.persistWorkspaceState(deps.getSnapshot());
  return deps.refreshProjectState();
}
