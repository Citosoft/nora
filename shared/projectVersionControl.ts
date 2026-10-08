import type { ProjectSummary, ProjectVersionControl } from "./types/workspace.types";

/**
 * Single gate for every git-backed feature (changes, branches, worktrees, forge).
 * Only an explicit "none" disables git, so projects saved before detection existed keep git features.
 */
export function isGitProject(project: Partial<Pick<ProjectSummary, "versionControl">> | null | undefined): boolean {
  return project?.versionControl !== "none";
}

/** Projects persisted before version control detection existed were always git repositories. */
export function parseProjectVersionControl(value: unknown): ProjectVersionControl {
  return value === "none" ? "none" : "git";
}

export const NON_GIT_PROJECT_ERROR = "This project is not a git repository, so git features are unavailable.";

export function assertGitProject(project: Partial<Pick<ProjectSummary, "versionControl">>): void {
  if (!isGitProject(project)) {
    throw new Error(NON_GIT_PROJECT_ERROR);
  }
}
