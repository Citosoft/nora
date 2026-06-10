import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { readStoredGithubToken, readStoredGitlabHost, readStoredGitlabToken } from "@/components/app/logic/appPersistence";
import { getForgeReviewCommentSelections } from "@/components/app/logic/forgeReviewHandoff";
import {
  listLoopRunReviewFeedbackWorkItems,
  resolveGitlabForgeRepoOverride
} from "@/components/app/logic/loopRunReviewFeedback";
import type { ForgeReviewCommentSelection } from "@/components/app/types/forgeReviewHandoff.types";
import type { ForgeOverview, ForgeWorkItemDetail, ForgeWorkItemSummary } from "@shared/appTypes";
import { useEffect, useMemo, useState } from "react";

export function useLoopRunReviewFeedback(projectId: string | null, enabled: boolean) {
  const [overview, setOverview] = useState<ForgeOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [overviewErrorMessage, setOverviewErrorMessage] = useState<string | null>(null);
  const [selectedWorkItemNumber, setSelectedWorkItemNumber] = useState<number | null>(null);
  const [detail, setDetail] = useState<ForgeWorkItemDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [selectedCommentIds, setSelectedCommentIds] = useState<string[]>([]);

  const workItems = useMemo(() => listLoopRunReviewFeedbackWorkItems(overview), [overview]);
  const commentSelections = useMemo(() => getForgeReviewCommentSelections(detail), [detail]);
  const selectedComments = useMemo(
    () => commentSelections.filter((comment) => selectedCommentIds.includes(comment.commentId)),
    [commentSelections, selectedCommentIds]
  );
  const selectedWorkItem = useMemo(
    () => workItems.find((item) => item.number === selectedWorkItemNumber) ?? null,
    [selectedWorkItemNumber, workItems]
  );

  useEffect(() => {
    if (!enabled || !projectId) {
      setOverview(null);
      setOverviewErrorMessage(null);
      setIsLoadingOverview(false);
      return;
    }

    let cancelled = false;
    setIsLoadingOverview(true);
    setOverviewErrorMessage(null);
    void noraIntegrationClient.getForgeOverview(projectId, {
      githubToken: readStoredGithubToken(),
      gitlabToken: readStoredGitlabToken(),
      gitlabHost: readStoredGitlabHost()
    }).then((nextOverview) => {
      if (cancelled) return;
      setOverview(nextOverview);
      setOverviewErrorMessage(nextOverview.errorMessage ?? null);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setOverview(null);
      setOverviewErrorMessage(error instanceof Error ? error.message : "Unable to load pull or merge requests.");
    }).finally(() => {
      if (!cancelled) setIsLoadingOverview(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, projectId]);

  useEffect(() => {
    if (!enabled || !projectId || selectedWorkItemNumber === null) {
      setDetail(null);
      setDetailErrorMessage(null);
      setSelectedCommentIds([]);
      setIsLoadingDetail(false);
      return;
    }

    const workItem = workItems.find((item) => item.number === selectedWorkItemNumber) ?? null;
    if (!workItem) {
      setDetail(null);
      setSelectedCommentIds([]);
      return;
    }

    let cancelled = false;
    setIsLoadingDetail(true);
    setDetailErrorMessage(null);
    const repoOverride = resolveGitlabForgeRepoOverride(workItem, readStoredGitlabHost());
    void noraIntegrationClient.getForgeWorkItemDetail(projectId, "pull_request", workItem.number, {
      githubToken: readStoredGithubToken(),
      gitlabToken: readStoredGitlabToken(),
      gitlabHost: readStoredGitlabHost(),
      forgeRepoHostOverride: repoOverride?.host ?? null,
      forgeRepoFullNameOverride: repoOverride?.fullName ?? null
    }).then((nextDetail) => {
      if (cancelled) return;
      setDetail(nextDetail);
      setSelectedCommentIds(getForgeReviewCommentSelections(nextDetail).map((comment) => comment.commentId));
    }).catch((error: unknown) => {
      if (cancelled) return;
      setDetail(null);
      setSelectedCommentIds([]);
      setDetailErrorMessage(error instanceof Error ? error.message : "Unable to load review comments.");
    }).finally(() => {
      if (!cancelled) setIsLoadingDetail(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, projectId, selectedWorkItemNumber, workItems]);

  function handleWorkItemChange(nextNumber: number | null): void {
    setSelectedWorkItemNumber(nextNumber);
    setSelectedCommentIds([]);
  }

  function toggleComment(commentId: string, checked: boolean): void {
    setSelectedCommentIds((current) =>
      checked
        ? Array.from(new Set([...current, commentId]))
        : current.filter((id) => id !== commentId)
    );
  }

  function selectAllComments(): void {
    setSelectedCommentIds(commentSelections.map((comment) => comment.commentId));
  }

  function clearComments(): void {
    setSelectedCommentIds([]);
  }

  function reset(): void {
    setSelectedWorkItemNumber(null);
    setDetail(null);
    setSelectedCommentIds([]);
    setDetailErrorMessage(null);
  }

  return {
    workItems,
    selectedWorkItem,
    selectedWorkItemNumber,
    handleWorkItemChange,
    isLoadingOverview,
    overviewErrorMessage,
    detail,
    isLoadingDetail,
    detailErrorMessage,
    commentSelections,
    selectedComments,
    selectedCommentIds,
    toggleComment,
    selectAllComments,
    clearComments,
    reset
  };
}

export type LoopRunReviewFeedbackState = ReturnType<typeof useLoopRunReviewFeedback>;
export type { ForgeReviewCommentSelection, ForgeWorkItemSummary };
