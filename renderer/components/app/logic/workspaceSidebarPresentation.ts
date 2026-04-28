import type { GithubBranchPullRequestState, WorkspaceSummary } from "@shared/appTypes";

export const formatWorkspaceSessionTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const getWorkspaceSidebarPullRequestDotClass = (state: GithubBranchPullRequestState): string => {
  if (state === "open") {
    return "bg-emerald-500";
  }
  if (state === "draft") {
    return "bg-amber-500";
  }
  if (state === "merged") {
    return "bg-violet-500";
  }
  return "bg-slate-500";
};

export const workspaceSidebarHasPullRequestState = (
  state: GithubBranchPullRequestState | null | undefined
): boolean => state === "open" || state === "draft" || state === "closed" || state === "merged";

export const getWorkspaceSidebarTooltip = (workspace: WorkspaceSummary): string => {
  const directSshLocation = workspace.project.location?.kind === "ssh" ? workspace.project.location : null;
  const directSshLabel = directSshLocation
    ? `${directSshLocation.user}@${directSshLocation.host}${directSshLocation.port ? `:${directSshLocation.port}` : ""}`
    : null;
  return directSshLabel
    ? `${workspace.project.name}\n${directSshLabel}\n${workspace.project.rootPath}`
    : workspace.project.rootPath;
};
