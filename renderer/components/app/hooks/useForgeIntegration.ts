import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { getActiveWorktree, normalizeForgeCreatePullRequestError } from "@/components/app/logic/appUtils";
import type { UseForgeIntegrationArgs, UseForgeIntegrationResult } from "@/components/app/types/appHooks.types";
import type {
  ForgeAddCommentPayload,
  ForgeBranchPullRequestStatus,
  ForgeOverview,
  ForgeWorkItemAction,
  ForgeWorkItemDetail,
  ForgeWorkItemKind
} from "@shared/appTypes";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useCallback, useEffect, useRef, useState } from "react";

export function useForgeIntegration({
  githubToken,
  gitlabToken,
  gitlabHost,
  updateGithubToken,
  updateGitlabToken,
  updateVercelToken,
  updateGithubAccountLabel,
  updateGitlabAccountLabel,
  updateVercelAccountLabel,
  statusBar,
  captureError,
  setActiveChangesPanelTab,
  setIsCreatePullRequestDialogOpen
}: UseForgeIntegrationArgs): UseForgeIntegrationResult {
  const snapshot = useCanonicalAppSnapshot();
  const [forgeOverview, setForgeOverview] = useState<ForgeOverview | null>(null);
  const [forgeBranchPullRequestStatus, setForgeBranchPullRequestStatus] = useState<ForgeBranchPullRequestStatus | null>(null);
  const [isLoadingForgeOverview, setIsLoadingForgeOverview] = useState(false);
  const [forgeWorkItemDetail, setForgeWorkItemDetail] = useState<ForgeWorkItemDetail | null>(null);
  const [isLoadingForgeWorkItemDetail, setIsLoadingForgeWorkItemDetail] = useState(false);
  const [forgeWorkItemDetailErrorMessage, setForgeWorkItemDetailErrorMessage] = useState<string | null>(null);
  const [isPerformingForgeWorkItemAction, setIsPerformingForgeWorkItemAction] = useState(false);
  const [isPostingForgeWorkItemComment, setIsPostingForgeWorkItemComment] = useState(false);
  const forgeWorkItemRepoOverrideRef = useRef<{ host: string; fullName: string } | null>(null);
  const activeBranch = (() => {
    if (!snapshot) {
      return "";
    }
    const activeWorktree = getActiveWorktree(snapshot);
    const focusedAgent = snapshot.agents.find((agent) => agent.id === snapshot.focusedAgentId) ?? null;
    const focusedTerminal = snapshot.terminals.find((terminal) => terminal.id === snapshot.focusedTerminalId) ?? null;
    return activeWorktree?.branch || focusedAgent?.branch || focusedTerminal?.branch || snapshot.project?.baseBranch || "";
  })();

  const setForgeWorkItemRepoOverrideValue = useCallback((next: { host: string; fullName: string } | null): void => {
    const current = forgeWorkItemRepoOverrideRef.current;
    const isSame =
      current?.host === next?.host &&
      current?.fullName === next?.fullName;
    if (isSame) {
      return;
    }
    forgeWorkItemRepoOverrideRef.current = next;
  }, []);

  useEffect(() => {
    const projectId = snapshot?.project?.id ?? null;
    if (!projectId) {
      setForgeOverview(null);
      setForgeBranchPullRequestStatus(null);
      setIsLoadingForgeOverview(false);
      setForgeWorkItemDetail(null);
      setForgeWorkItemRepoOverrideValue(null);
      setIsLoadingForgeWorkItemDetail(false);
      setForgeWorkItemDetailErrorMessage(null);
      return;
    }

    let mounted = true;
    setIsLoadingForgeOverview(true);
    noraIntegrationClient.getForgeOverview(projectId, {
      githubToken,
      gitlabToken,
      gitlabHost
    }).then((nextOverview) => {
      if (!mounted) {
        return;
      }
      setForgeOverview(nextOverview);
      setIsLoadingForgeOverview(false);
      setForgeWorkItemDetail(null);
      setForgeWorkItemRepoOverrideValue(null);
      setForgeWorkItemDetailErrorMessage(null);
    }).catch((error: unknown) => {
      if (!mounted) {
        return;
      }
      setForgeOverview({
        repo: null,
        pullRequests: [],
        issues: [],
        workflowRuns: [],
        gitlabUserMergeRequests: [],
        gitlabUserMergeRequestsErrorMessage: null,
        errorMessage: error instanceof Error ? error.message : "Unable to load forge data."
      });
      setIsLoadingForgeOverview(false);
      setForgeWorkItemDetail(null);
      setForgeWorkItemRepoOverrideValue(null);
      setForgeWorkItemDetailErrorMessage(null);
    });

    return () => {
      mounted = false;
    };
  }, [snapshot?.project?.id, githubToken, gitlabToken, gitlabHost, setForgeWorkItemRepoOverrideValue]);

  useEffect(() => {
    const projectId = snapshot?.project?.id ?? null;
    const branch = activeBranch.trim();
    if (!projectId || !branch || forgeOverview?.repo?.provider !== "github") {
      console.info("[forge-pr-debug][renderer] skipping branch status fetch", {
        projectId,
        branch,
        provider: forgeOverview?.repo?.provider ?? null
      });
      setForgeBranchPullRequestStatus(null);
      return;
    }

    let mounted = true;
    console.info("[forge-pr-debug][renderer] requesting branch status", {
      projectId,
      branch
    });
    noraIntegrationClient.getForgeBranchPullRequestStatus(projectId, branch, {
      githubToken,
      gitlabToken,
      gitlabHost
    }).then((nextStatus) => {
      if (!mounted) {
        return;
      }
      console.info("[forge-pr-debug][renderer] received branch status", {
        projectId,
        branch,
        nextStatus
      });
      setForgeBranchPullRequestStatus(nextStatus);
    }).catch(() => {
      if (!mounted) {
        return;
      }
      console.info("[forge-pr-debug][renderer] branch status request failed", {
        projectId,
        branch
      });
      setForgeBranchPullRequestStatus(null);
    });

    return () => {
      mounted = false;
    };
  }, [snapshot?.project?.id, activeBranch, forgeOverview, githubToken, gitlabToken, gitlabHost]);

  const connectForgeAccount = useCallback(async (provider: "github" | "gitlab" | "vercel"): Promise<void> => {
    const providerLabel = provider === "github" ? "GitHub" : provider === "gitlab" ? "GitLab" : "Vercel";
    const statusId = statusBar.beginStatus(`Connecting ${providerLabel}`, true);
    try {
      const result = await noraIntegrationClient.startForgeOAuth(provider);
      if (result.provider === "github") {
        updateGithubToken(result.accessToken);
        updateGithubAccountLabel(result.accountLabel);
      } else if (result.provider === "gitlab") {
        updateGitlabToken(result.accessToken);
        updateGitlabAccountLabel(result.accountLabel);
      } else {
        updateVercelToken(result.accessToken);
        updateVercelAccountLabel(result.accountLabel);
      }
    } catch (error: unknown) {
      captureError(error);
    } finally {
      statusBar.endStatus(statusId);
    }
  }, [captureError, statusBar, updateGithubAccountLabel, updateGithubToken, updateGitlabAccountLabel, updateGitlabToken, updateVercelAccountLabel, updateVercelToken]);

  const refreshForgeOverview = useCallback((): void => {
    if (!snapshot?.project) {
      return;
    }
    setForgeWorkItemDetail(null);
    setForgeWorkItemDetailErrorMessage(null);
    setIsLoadingForgeOverview(true);
    void noraIntegrationClient.getForgeOverview(snapshot.project.id, {
      githubToken,
      gitlabToken,
      gitlabHost
    }).then((nextOverview) => {
      setForgeOverview(nextOverview);
      setIsLoadingForgeOverview(false);
    }).catch((error: unknown) => {
      setForgeOverview({
        repo: null,
        pullRequests: [],
        issues: [],
        workflowRuns: [],
        gitlabUserMergeRequests: [],
        gitlabUserMergeRequestsErrorMessage: null,
        errorMessage: error instanceof Error ? error.message : "Unable to load forge data."
      });
      setIsLoadingForgeOverview(false);
    });
  }, [snapshot?.project, githubToken, gitlabToken, gitlabHost]);

  const loadForgeWorkItemDetail = useCallback(async (
    kind: ForgeWorkItemKind,
    number: number,
    repoOverride?: { host: string; fullName: string } | null
  ): Promise<void> => {
    if (!snapshot?.project) {
      return;
    }

    const nextRepoOverride = repoOverride === undefined ? forgeWorkItemRepoOverrideRef.current : (repoOverride ?? null);
    setForgeWorkItemRepoOverrideValue(nextRepoOverride);
    setIsLoadingForgeWorkItemDetail(true);
    setForgeWorkItemDetailErrorMessage(null);
    try {
      const nextDetail = await noraIntegrationClient.getForgeWorkItemDetail(snapshot.project.id, kind, number, {
        githubToken,
        gitlabToken,
        gitlabHost,
        forgeRepoHostOverride: nextRepoOverride?.host ?? null,
        forgeRepoFullNameOverride: nextRepoOverride?.fullName ?? null
      });
      setForgeWorkItemDetail(nextDetail);
    } catch (error: unknown) {
      setForgeWorkItemDetailErrorMessage(error instanceof Error ? error.message : "Unable to load item details.");
    } finally {
      setIsLoadingForgeWorkItemDetail(false);
    }
  }, [snapshot?.project, githubToken, gitlabToken, gitlabHost, setForgeWorkItemRepoOverrideValue]);

  const performForgeWorkItemAction = useCallback(async (action: ForgeWorkItemAction): Promise<void> => {
    if (!snapshot?.project || !forgeWorkItemDetail) {
      return;
    }

    setIsPerformingForgeWorkItemAction(true);
    setForgeWorkItemDetailErrorMessage(null);
    try {
      const nextDetail = await noraIntegrationClient.performForgeWorkItemAction(
        snapshot.project.id,
        forgeWorkItemDetail.kind,
        forgeWorkItemDetail.item.number,
        action,
        {
          githubToken,
          gitlabToken,
          gitlabHost,
          forgeRepoHostOverride: forgeWorkItemRepoOverrideRef.current?.host ?? null,
          forgeRepoFullNameOverride: forgeWorkItemRepoOverrideRef.current?.fullName ?? null
        }
      );
      setForgeWorkItemDetail(nextDetail);

      const nextOverview = await noraIntegrationClient.getForgeOverview(snapshot.project.id, {
        githubToken,
        gitlabToken,
        gitlabHost
      });
      setForgeOverview(nextOverview);
    } catch (error: unknown) {
      setForgeWorkItemDetailErrorMessage(error instanceof Error ? error.message : "Unable to update item.");
    } finally {
      setIsPerformingForgeWorkItemAction(false);
    }
  }, [snapshot?.project, forgeWorkItemDetail, githubToken, gitlabToken, gitlabHost]);

  const addForgeWorkItemComment = useCallback(async (payload: ForgeAddCommentPayload): Promise<void> => {
    if (!snapshot?.project || !forgeWorkItemDetail) {
      return;
    }

    setIsPostingForgeWorkItemComment(true);
    setForgeWorkItemDetailErrorMessage(null);
    try {
      const nextDetail = await noraIntegrationClient.addForgeWorkItemComment(
        snapshot.project.id,
        forgeWorkItemDetail.kind,
        forgeWorkItemDetail.item.number,
        payload,
        {
          githubToken,
          gitlabToken,
          gitlabHost,
          forgeRepoHostOverride: forgeWorkItemRepoOverrideRef.current?.host ?? null,
          forgeRepoFullNameOverride: forgeWorkItemRepoOverrideRef.current?.fullName ?? null
        }
      );
      setForgeWorkItemDetail(nextDetail);

      const nextOverview = await noraIntegrationClient.getForgeOverview(snapshot.project.id, {
        githubToken,
        gitlabToken,
        gitlabHost
      });
      setForgeOverview(nextOverview);
    } catch (error: unknown) {
      setForgeWorkItemDetailErrorMessage(error instanceof Error ? error.message : "Unable to add comment.");
    } finally {
      setIsPostingForgeWorkItemComment(false);
    }
  }, [snapshot?.project, forgeWorkItemDetail, githubToken, gitlabToken, gitlabHost]);

  const handleCreateForgePullRequest = useCallback(async (payload: { title: string; body: string; sourceBranch: string; baseBranch: string }): Promise<void> => {
    if (!snapshot?.project) {
      throw new Error("Choose a project before creating a pull request.");
    }

    const statusId = statusBar.beginStatus("Creating pull request", true);
    let detail = null;
    try {
      detail = await noraIntegrationClient.createForgePullRequest(snapshot.project.id, payload, {
        githubToken,
        gitlabToken,
        gitlabHost
      });
    } catch (error: unknown) {
      throw new Error(normalizeForgeCreatePullRequestError(error));
    } finally {
      statusBar.endStatus(statusId);
    }

    if (!detail) {
      throw new Error("Unable to create pull request.");
    }

    setIsCreatePullRequestDialogOpen(false);
    setActiveChangesPanelTab("forge");
    setForgeWorkItemDetail(detail);
    setForgeWorkItemRepoOverrideValue(null);
    setForgeWorkItemDetailErrorMessage(null);

    try {
      const nextOverview = await noraIntegrationClient.getForgeOverview(snapshot.project.id, {
        githubToken,
        gitlabToken,
        gitlabHost
      });
      setForgeOverview(nextOverview);
    } catch (error: unknown) {
      setForgeOverview((current) =>
        current ?? {
          repo: null,
          pullRequests: [],
          issues: [],
          workflowRuns: [],
          gitlabUserMergeRequests: [],
          gitlabUserMergeRequestsErrorMessage: null,
          errorMessage: error instanceof Error ? error.message : "Unable to refresh forge data."
        }
      );
    }
  }, [snapshot?.project, statusBar, githubToken, gitlabToken, gitlabHost, setIsCreatePullRequestDialogOpen, setActiveChangesPanelTab, setForgeWorkItemRepoOverrideValue]);

  return {
    forgeOverview,
    forgeBranchPullRequestStatus,
    isLoadingForgeOverview,
    forgeWorkItemDetail,
    isLoadingForgeWorkItemDetail,
    forgeWorkItemDetailErrorMessage,
    isPerformingForgeWorkItemAction,
    isPostingForgeWorkItemComment,
    connectForgeAccount,
    refreshForgeOverview,
    loadForgeWorkItemDetail,
    performForgeWorkItemAction,
    addForgeWorkItemComment,
    handleCreateForgePullRequest,
    setForgeWorkItemDetail,
    setForgeWorkItemDetailErrorMessage
  };
}
