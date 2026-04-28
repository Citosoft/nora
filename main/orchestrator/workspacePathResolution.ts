import type { ProjectSummary, WorktreeRecord } from "@shared/appTypes";
import type { WorkspaceTarget } from "../types/internal.types";

export function getProjectTarget(project: ProjectSummary): WorkspaceTarget {
  return {
    path: project.rootPath,
    location: project.location
  };
}

export function getWorktreeTarget(
  project: ProjectSummary,
  worktree: Pick<WorktreeRecord, "path" | "location">
): WorkspaceTarget {
  return {
    path: worktree.path,
    location: worktree.location || project.location
  };
}

export function resolveWorkspaceFileTarget(
  project: ProjectSummary,
  worktrees: WorktreeRecord[],
  rootPath?: string
): WorkspaceTarget {
  if (!rootPath || rootPath === project.rootPath) {
    return getProjectTarget(project);
  }

  const worktree = worktrees.find((candidate) =>
    candidate.projectId === project.id &&
    candidate.path === rootPath
  );

  if (!worktree) {
    throw new Error("The selected workspace path could not be resolved.");
  }

  return getWorktreeTarget(project, worktree);
}

