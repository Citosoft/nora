import type { ProjectSummary, WorktreeRecord } from "@shared/appTypes";
import fs from "node:fs";
import path from "node:path";
import type { WorkspaceTarget } from "../types/internal.types";
import { normalizeLocalPath } from "./gitWorkspaceCommandUtils";

function normalizeSshWorkspaceRoot(value: string): string {
  return value.trim().replace(/[\\/]+$/, "").replace(/\\/g, "/");
}

function localWorkspaceRootsEqual(left: string, right: string): boolean {
  const resolveExisting = (value: string): string => {
    try {
      return fs.realpathSync(value);
    } catch {
      return path.resolve(value);
    }
  };
  return normalizeLocalPath(resolveExisting(left)) === normalizeLocalPath(resolveExisting(right));
}

function workspaceRootsEqualForProject(left: string, right: string, project: ProjectSummary): boolean {
  if (project.location?.kind === "ssh") {
    return normalizeSshWorkspaceRoot(left) === normalizeSshWorkspaceRoot(right);
  }
  return localWorkspaceRootsEqual(left, right);
}

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
  if (!rootPath) {
    return getProjectTarget(project);
  }

  if (workspaceRootsEqualForProject(rootPath, project.rootPath, project)) {
    return getProjectTarget(project);
  }

  const worktree = worktrees.find((candidate) =>
    candidate.projectId === project.id &&
    workspaceRootsEqualForProject(candidate.path, rootPath, project)
  );

  if (!worktree) {
    throw new Error("The selected workspace path could not be resolved.");
  }

  return getWorktreeTarget(project, worktree);
}

