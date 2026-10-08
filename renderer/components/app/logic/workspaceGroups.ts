import type { AppState, WorkspaceSummary } from "@shared/appTypes";

/** Open workspaces with the focused project first-class (its live snapshot fields win), minus any being removed. */
export const buildWorkspaceGroups = (snapshot: AppState | null, removingWorkspaceRootSet: ReadonlySet<string>): WorkspaceSummary[] => {
  if (!snapshot) {
    return [];
  }
  const currentWorkspaceSummary: WorkspaceSummary | null = snapshot.project
    ? {
        project: snapshot.project,
        sessions: snapshot.sessions,
        worktrees: snapshot.worktrees,
        agents: snapshot.agents,
        terminals: snapshot.terminals
      }
    : null;
  const groups = [
    ...(currentWorkspaceSummary &&
    !snapshot.workspaces.some((workspace) => workspace.project.id === currentWorkspaceSummary.project.id)
      ? [currentWorkspaceSummary]
      : []),
    ...snapshot.workspaces
  ].map((workspace) =>
    currentWorkspaceSummary && workspace.project.id === currentWorkspaceSummary.project.id
      ? currentWorkspaceSummary
      : workspace
  );
  return groups.filter((workspace) => !removingWorkspaceRootSet.has(workspace.project.rootPath));
};
