import type {
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
  ForgeCreatePullRequestPayload,
  ForgeRepoSummary,
  ForgeRequestOptions,
  ForgeWorkItemAction,
  ForgeWorkItemKind,
  ForgeWorkItemSummary
} from "@shared/appTypes";
import type { ForgeHelperDeps, ForgeHelpers } from "../types/orchestratorForge.types";

const NO_REPO_ERROR = "No supported GitHub or GitLab origin remote was found for this workspace.";

function normalizeGitlabHost(candidate: string | null | undefined): string | null {
  const trimmed = candidate?.trim();
  if (!trimmed) {
    return null;
  }
  const withScheme = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    return parsed.host || null;
  } catch {
    const host = trimmed.replace(/^https?:\/\//i, "").split("/")[0]?.trim();
    return host || null;
  }
}

export function createForgeHelpers(deps: ForgeHelperDeps): ForgeHelpers {
  async function resolveForgeRepo(
    projectId: string,
    options: ForgeRequestOptions
  ): Promise<ForgeRepoSummary | null> {
    const overrideHost = normalizeGitlabHost(options.forgeRepoHostOverride) ?? null;
    const overrideFullName = options.forgeRepoFullNameOverride?.trim() ?? "";
    if (overrideHost && overrideFullName) {
      const segments = overrideFullName.split("/").filter(Boolean);
      if (segments.length >= 2) {
        return {
          provider: "gitlab",
          host: overrideHost,
          owner: segments[0] ?? "",
          name: segments.slice(1).join("/"),
          fullName: overrideFullName,
          webUrl: `https://${overrideHost}/${overrideFullName}`
        };
      }
    }

    const project = await deps.resolveProjectSummaryById(projectId);
    return deps.getWorkspaceForgeRepo(deps.getProjectTarget(project));
  }

  async function getForgeOverview(projectId: string, options: ForgeRequestOptions) {
    const project = await deps.resolveProjectSummaryById(projectId);
    let gitlabUserMergeRequests: ForgeWorkItemSummary[] = [];
    let gitlabUserMergeRequestsErrorMessage: string | null = null;
    try {
      const repo = await deps.getWorkspaceForgeRepo(deps.getProjectTarget(project));
      if (options.gitlabToken?.trim()) {
        const gitlabHost = normalizeGitlabHost(options.gitlabHost) ?? (repo?.provider === "gitlab" ? repo.host : "gitlab.com");
        try {
          gitlabUserMergeRequests = await deps.fetchGitlabUserMergeRequests(gitlabHost, options);
        } catch (error: unknown) {
          gitlabUserMergeRequestsErrorMessage = error instanceof Error ? error.message : "Unable to load GitLab merge requests.";
        }
      }
      if (!repo) {
        return {
          repo: null,
          pullRequests: [],
          issues: [],
          workflowRuns: [],
          gitlabUserMergeRequests,
          gitlabUserMergeRequestsErrorMessage,
          errorMessage: null
        };
      }

      const overview = await deps.fetchForgeOverviewForRepo(repo, options);
      return {
        ...overview,
        gitlabUserMergeRequests,
        gitlabUserMergeRequestsErrorMessage
      };
    } catch (error: unknown) {
      return {
        repo: null,
        pullRequests: [],
        issues: [],
        workflowRuns: [],
        gitlabUserMergeRequests,
        gitlabUserMergeRequestsErrorMessage,
        errorMessage: error instanceof Error ? error.message : "Unable to load forge data."
      };
    }
  }

  async function getForgeBranchPullRequestStatus(
    projectId: string,
    branch: string,
    options: ForgeRequestOptions
  ) {
    const normalizedBranch = branch.trim();
    if (!normalizedBranch) {
      return null;
    }

    const project = await deps.resolveProjectSummaryById(projectId);
    try {
      const state = deps.getSnapshot();
      const sourcePath = state.project?.id === projectId
        ? deps.getActiveChangesRoot(state)
        : project.rootPath;
      const sourceTarget = { path: sourcePath, location: project.location };
      const hasRemoteTrackingBranch = await deps.hasRemoteTrackingBranchForTarget(sourceTarget);
      const hasRemoteBranch = hasRemoteTrackingBranch
        ? true
        : await deps.hasRemoteBranchForTarget(sourceTarget, normalizedBranch);
      const hasPublishedBranch = hasRemoteTrackingBranch || hasRemoteBranch;
      console.info("[forge-pr-debug][main] branch publish checks", {
        projectId,
        branch: normalizedBranch,
        sourcePath,
        hasRemoteTrackingBranch,
        hasRemoteBranch,
        hasPublishedBranch
      });
      const repo = await deps.getWorkspaceForgeRepo(deps.getProjectTarget(project));
      if (!repo) {
        console.info("[forge-pr-debug][main] no forge repo resolved", {
          projectId,
          branch: normalizedBranch
        });
        return null;
      }
      const status = await deps.fetchForgeBranchPullRequestStatusForRepo(repo, normalizedBranch, options);
      if (!status) {
        if (!hasPublishedBranch) {
          console.info("[forge-pr-debug][main] no status and branch not published", {
            projectId,
            branch: normalizedBranch,
            repo: repo.fullName
          });
          return null;
        }
        const fallbackStatus: ForgeBranchPullRequestStatus = {
          branch: normalizedBranch,
          branchExistsOnRemote: true,
          state: "no_pull_request",
          label: "No pull request",
          pullRequestNumber: null,
          webUrl: null
        };
        console.info("[forge-pr-debug][main] using published-branch fallback status", {
          projectId,
          branch: normalizedBranch,
          repo: repo.fullName
        });
        return fallbackStatus;
      }

      if (hasPublishedBranch && !status.branchExistsOnRemote) {
        console.info("[forge-pr-debug][main] overriding branchExistsOnRemote to true from local checks", {
          projectId,
          branch: normalizedBranch,
          repo: repo.fullName,
          originalStatus: status
        });
        return {
          ...status,
          branchExistsOnRemote: true
        };
      }

      console.info("[forge-pr-debug][main] returning forge branch status", {
        projectId,
        branch: normalizedBranch,
        repo: repo.fullName,
        status
      });
      return status;
    } catch (error: unknown) {
      console.info("[forge-pr-debug][main] getForgeBranchPullRequestStatus failed", {
        projectId,
        branch: normalizedBranch,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  async function getForgeWorkItemDetail(
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    options: ForgeRequestOptions
  ) {
    const repo = await resolveForgeRepo(projectId, options);
    if (!repo) {
      throw new Error(NO_REPO_ERROR);
    }
    return deps.fetchForgeWorkItemDetail(repo, kind, number, options);
  }

  async function getForgeWorkflowRunDetail(
    projectId: string,
    runId: number,
    options: ForgeRequestOptions
  ) {
    const repo = await resolveForgeRepo(projectId, options);
    if (!repo) {
      throw new Error(NO_REPO_ERROR);
    }
    return deps.fetchForgeWorkflowRunDetailForRepo(repo, runId, options);
  }

  async function addForgeWorkItemComment(
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    payload: ForgeAddCommentPayload,
    options: ForgeRequestOptions
  ) {
    const repo = await resolveForgeRepo(projectId, options);
    if (!repo) {
      throw new Error(NO_REPO_ERROR);
    }
    await deps.addForgeWorkItemCommentForRepo(repo, kind, number, payload, options);
    return deps.fetchForgeWorkItemDetail(repo, kind, number, options);
  }

  async function createForgePullRequest(
    projectId: string,
    payload: ForgeCreatePullRequestPayload,
    options: ForgeRequestOptions
  ) {
    const state = deps.getSnapshot();
    const project = await deps.resolveProjectSummaryById(projectId);
    const repo = await deps.getWorkspaceForgeRepo(deps.getProjectTarget(project));
    if (!repo) {
      throw new Error(NO_REPO_ERROR);
    }

    const sourcePath = state.project?.id === projectId
      ? deps.getActiveChangesRoot(state)
      : project.rootPath;
    await deps.pushWorkspaceChanges({ path: sourcePath, location: project.location });
    const sourceBranch = payload.sourceBranch.trim() || await deps.readCurrentBranch({ path: sourcePath, location: project.location });
    return deps.createForgePullRequestForRepo(repo, sourceBranch, payload, options);
  }

  async function performForgeWorkItemAction(
    projectId: string,
    kind: ForgeWorkItemKind,
    number: number,
    action: ForgeWorkItemAction,
    options: ForgeRequestOptions
  ) {
    const repo = await resolveForgeRepo(projectId, options);
    if (!repo) {
      throw new Error(NO_REPO_ERROR);
    }

    await deps.performForgeWorkItemActionForRepo(repo, kind, number, action, options);
    return deps.fetchForgeWorkItemDetail(repo, kind, number, options);
  }

  return {
    getForgeOverview,
    getForgeBranchPullRequestStatus,
    getForgeWorkItemDetail,
    getForgeWorkflowRunDetail,
    addForgeWorkItemComment,
    createForgePullRequest,
    performForgeWorkItemAction
  };
}
