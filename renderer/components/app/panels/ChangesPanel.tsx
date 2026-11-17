import { WorkspaceInstructionsPanel } from "@/components/app/panels/WorkspaceInstructionsPanel";
import { WorkspaceMemoryPanel } from "@/components/app/panels/WorkspaceMemoryPanel";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { useChangesPanelChrome,
  useChangesPanelFiles,
  useChangesPanelForge,
  useChangesPanelVercel,
  useChangesPanelWorkspace
} from "@/components/app/context/changesPanelContext";
import { useDiffAnnotations } from "@/components/app/context/diffAnnotationContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useChangesCheckoutOptions } from "@/components/app/hooks/useChangesCheckoutOptions";
import { getChangesCheckoutPath } from "@/components/app/logic/changesCheckoutOptions";
import { ChangesCheckoutPicker } from "@/components/app/panels/ChangesCheckoutPicker";
import { ChangedFileRow } from "@/components/app/panels/changes-panel/ChangedFileRow";
import { SidebarTabBar } from "@/components/app/panels/changes-panel/SidebarTabBar";
import { CommitComposer } from "@/components/app/panels/changes-panel/CommitComposer";
import { CommitHistoryRow } from "@/components/app/panels/changes-panel/CommitHistoryRow";
import { SidebarIconAction } from "@/components/app/panels/changes-panel/SidebarIconAction";
import { SidebarSectionHeader } from "@/components/app/panels/changes-panel/SidebarSectionHeader";
import { useStatusBar } from "@/components/app/logic/statusBarContext";
import { getBranchCheckoutBlockedReason, getCheckoutableBranches } from "@/components/app/logic/branchCheckout";
import { FileTreePanel } from "@/components/app/panels/FileTreePanel";
import { ForgePanel } from "@/components/app/panels/ForgePanel";
import { DiffReviewCountBadge, DiffReviewTray } from "@/components/app/panels/diff-annotation/DiffReviewTray";
import { VercelPanel } from "@/components/app/panels/VercelPanel";
import { BranchCheckoutMenu } from "@/components/app/shared/BranchCheckoutMenu";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ChangesPanelTab, ChangesPanelTabPresentation } from "@/components/app/types/changesPanelTab.types";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  AppState,
  ChangeEntry,
  CommitHistoryEntry,
  GithubBranchPullRequestState,
  WorkspaceSearchResult
} from "@shared/appTypes";
import {
  ArrowDown,
  ArrowUp,
  Brain,
  BookOpen,
  FileText,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  History,
  LoaderCircle,
  RefreshCcw,
  Undo2
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function VercelMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 4 20 18H4L12 4Z" />
    </svg>
  );
}

function getPullRequestStatusDotClass(state: GithubBranchPullRequestState | null): string {
  if (state === "open") {
    return "bg-emerald-500";
  }
  if (state === "draft") {
    return "bg-amber-500";
  }
  if (state === "merged") {
    return "bg-violet-500";
  }
  if (state === "closed") {
    return "bg-slate-500";
  }
  return "bg-muted-foreground/60";
}

const CHANGES_PANEL_TAB_PRESENTATION: Record<ChangesPanelTab, ChangesPanelTabPresentation> = {
  git: { label: "Git", Icon: FolderGit2 },
  files: { label: "Files", Icon: FileText },
  instructions: { label: "Instructions", Icon: BookOpen, title: "Workspace AGENTS.md and CLAUDE.md" },
  memory: { label: "Memory", Icon: Brain, title: "Nora’s memories for this workspace" },
  vercel: { label: "Vercel", Icon: VercelMark },
  forge: { label: "Forge", Icon: GitBranch }
};

function ChangesPanelInner({ snapshot }: { snapshot: AppState }) {
  const { tools } = useChangesPanelWorkspace();
  const {
    paths: filePaths,
    directoryPaths: fileDirectoryPaths,
    changeCounts: fileChangeCounts,
    loading: fileTreeLoading,
    errorMessage: fileTreeErrorMessage,
    onOpenFile,
    onImportImageToDirectory,
    onCreateFile,
    onCreateDirectory,
    onRenameFile,
    onDeleteFile
  } = useChangesPanelFiles();
  const {
    overview: forgeOverview,
    branchPullRequestStatus: forgeBranchPullRequestStatus,
    loading: forgeLoading,
    detail: forgeDetail,
    detailLoading: forgeDetailLoading,
    detailErrorMessage: forgeDetailErrorMessage,
    actionLoading: forgeActionLoading,
    commentLoading: forgeCommentLoading,
    onRefresh: onRefreshForge,
    onOpenUrl: onOpenForgeUrl,
    onOpenForgeViewer,
    onOpenForgeItem,
    onOpenForgeWorkflowRun,
    onBackFromForgeItem,
    onRefreshForgeItem,
    onForgeAction,
    onForgeCommentSubmit,
    onStartIssueThread,
    onSpawnReviewAgent,
    onOpenCreatePullRequest
  } = useChangesPanelForge();
  const {
    vercelToken,
    vercelAccountLabel,
    vercelProjects,
    vercelDeployments,
    linkedVercelProject,
    suggestedVercelProject,
    vercelProjectsLoading,
    vercelDeploymentsLoading,
    redeployingVercelDeploymentId,
    vercelProjectsErrorMessage,
    vercelDeploymentsErrorMessage,
    onRefreshVercelProjects,
    onRefreshVercelDeployments,
    onRedeployVercelDeployment,
    onOpenVercelSettings,
    onLinkVercelProject,
    onUnlinkVercelProject
  } = useChangesPanelVercel();
  const {
    resolvedTheme,
    collapsed,
    activeTab,
    availableTabs,
    activeFilePath,
    activeBranch,
    selectedChange,
    onActiveTabChange,
    onRefreshChanges,
    onSelectChange,
    onDiscardChange,
    onOpenFullDiff,
    onCommitChanges,
    canGenerateAiCommitMessage,
    onGenerateCommitMessage,
    onPullChanges,
    onPushChanges,
    onCheckoutWorkspaceBranch,
    onSelectChangesCheckout,
    onEditChange,
    onInspectCommit,
    onClearCommitInspection
  } = useChangesPanelChrome();
  const { annotationCount, getAnnotationCountForPath } = useDiffAnnotations();
  const statusBar = useStatusBar();
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isGeneratingCommitMessage, setIsGeneratingCommitMessage] = useState(false);
  const [generatedCommitProvider, setGeneratedCommitProvider] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [gitStatusAheadCount, setGitStatusAheadCount] = useState(0);
  const [gitStatusBehindCount, setGitStatusBehindCount] = useState(0);
  const [gitStatusHasConfiguredUpstream, setGitStatusHasConfiguredUpstream] = useState(true);
  const [gitStatusRemoteBranches, setGitStatusRemoteBranches] = useState<string[]>([]);
  const [gitStatusIsDirty, setGitStatusIsDirty] = useState(false);
  const [isSettingUpstream, setIsSettingUpstream] = useState(false);
  const [isCheckingOutBranch, setIsCheckingOutBranch] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [fileSearchResults, setFileSearchResults] = useState<WorkspaceSearchResult[]>([]);
  const [isSearchingFiles, setIsSearchingFiles] = useState(false);
  const [isCaseSensitiveFileSearch, setIsCaseSensitiveFileSearch] = useState(false);
  const [isRecentCommitsCollapsed, setIsRecentCommitsCollapsed] = useState(false);
  const [isChangedFilesCollapsed, setIsChangedFilesCollapsed] = useState(false);
  const [isRefreshingChanges, setIsRefreshingChanges] = useState(false);
  const [discardingChangePath, setDiscardingChangePath] = useState<string | null>(null);
  const [selectedCommitPaths, setSelectedCommitPaths] = useState<string[] | null>(null);
  const refreshInFlightRef = useRef(false);
  const onRefreshChangesRef = useRef(onRefreshChanges);
  onRefreshChangesRef.current = onRefreshChanges;

  const loadGitStatusSummary = useCallback(async () => {
    if (!snapshot.project || activeTab !== "git" || collapsed) {
      setGitStatusAheadCount(0);
      setGitStatusBehindCount(0);
      setGitStatusHasConfiguredUpstream(true);
      setGitStatusRemoteBranches([]);
      setGitStatusIsDirty(false);
      return;
    }

    try {
      const summary = await noraWorkspaceClient.getWorkspaceGitStatusSummary({
        projectId: snapshot.project.id,
        rootPath: snapshot.changesRoot || undefined
      });
      setGitStatusAheadCount(summary.aheadCount);
      setGitStatusBehindCount(summary.behindCount);
      setGitStatusHasConfiguredUpstream(summary.hasConfiguredUpstream);
      setGitStatusRemoteBranches(summary.remoteBranches);
      setGitStatusIsDirty(summary.lines.length > 0);
    } catch {
      setGitStatusAheadCount(0);
      setGitStatusBehindCount(0);
      setGitStatusHasConfiguredUpstream(true);
      setGitStatusRemoteBranches([]);
      setGitStatusIsDirty(false);
    }
  }, [activeTab, collapsed, snapshot.changesRoot, snapshot.project]);

  useEffect(() => {
    setCommitMessage("");
    setSelectedCommitPaths(null);
    setGeneratedCommitProvider(null);
  }, [snapshot.changesRoot, snapshot.project?.rootPath, snapshot.selectedCommitHash]);

  useEffect(() => {
    if (activeTab !== "files") {
      setIsSearchingFiles(false);
      return;
    }

    const trimmedQuery = fileSearchQuery.trim();
    if (!trimmedQuery || !snapshot.project) {
      setFileSearchResults([]);
      setIsSearchingFiles(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsSearchingFiles(true);
      void noraWorkspaceClient.searchWorkspaceFiles({
        projectId: snapshot.project!.id,
        query: trimmedQuery,
        rootPath: snapshot.changesRoot || undefined,
        caseSensitive: isCaseSensitiveFileSearch
      }).then((results) => {
        if (!cancelled) {
          setFileSearchResults(results);
          setIsSearchingFiles(false);
        }
      }).catch(() => {
        if (!cancelled) {
          setFileSearchResults([]);
          setIsSearchingFiles(false);
        }
      });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeTab, fileSearchQuery, isCaseSensitiveFileSearch, snapshot.changesRoot, snapshot.project]);

  const formatCommitTimestamp = (timestamp: string) =>
    new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(timestamp));

  const changesCheckoutPath = getChangesCheckoutPath(snapshot);
  const changesCheckoutOptions = useChangesCheckoutOptions();

  const selectedCommit = snapshot.selectedCommit;
  const isInspectingCommit = !!selectedCommit;
  const forgeProvider = forgeOverview?.repo?.provider ?? null;
  const changeCount = snapshot.changes.length;
  const checkoutableBranches = useMemo(
    () => getCheckoutableBranches(snapshot.projectBranches, activeBranch),
    [activeBranch, snapshot.projectBranches]
  );
  const branchCheckoutBlockedReason = snapshot.project
    ? getBranchCheckoutBlockedReason({
        isInspectingCommit,
        hasUncommittedChanges: gitStatusIsDirty,
        checkoutableBranchCount: checkoutableBranches.length
      })
    : "Open a project to switch branches";
  const fileCount = filePaths.length;
  const additionsTotal = snapshot.changes.reduce((total, change) => total + change.additions, 0);
  const deletionsTotal = snapshot.changes.reduce((total, change) => total + change.deletions, 0);
  const requiresPublishedBranchForPullRequest = forgeOverview?.repo?.provider === "github";
  const hasPublishedBranchForPullRequest = !requiresPublishedBranchForPullRequest || !!forgeBranchPullRequestStatus?.branchExistsOnRemote;
  const canCreatePullRequest = !!forgeOverview?.repo && !!activeBranch && !isInspectingCommit && hasPublishedBranchForPullRequest;
  const createPullRequestLabel = forgeOverview?.repo?.provider === "gitlab" ? "Create MR" : "Create PR";
  const createPullRequestDisabledReason = !forgeOverview?.repo
    ? "Connect a GitHub or GitLab remote to create a pull request."
    : !activeBranch
      ? "Active branch unavailable."
      : isInspectingCommit
        ? "Return to working tree to create a pull request."
        : requiresPublishedBranchForPullRequest && !hasPublishedBranchForPullRequest
          ? "Push this branch to the remote before creating a pull request."
          : null;
  useEffect(() => {
    if (forgeProvider !== "github") {
      return;
    }
    console.info("[forge-pr-debug][renderer] create PR gating", {
      activeBranch,
      statusBranch: forgeBranchPullRequestStatus?.branch ?? null,
      branchExistsOnRemote: forgeBranchPullRequestStatus?.branchExistsOnRemote ?? null,
      state: forgeBranchPullRequestStatus?.state ?? null,
      canCreatePullRequest,
      createPullRequestDisabledReason,
      isInspectingCommit,
      hasRepo: !!forgeOverview?.repo
    });
  }, [
    activeBranch,
    canCreatePullRequest,
    createPullRequestDisabledReason,
    forgeBranchPullRequestStatus,
    forgeOverview?.repo,
    forgeProvider,
    isInspectingCommit
  ]);
  const selectedPaths = selectedCommitPaths ?? snapshot.changes.map((change) => change.path);
  const selectedPathSet = new Set(selectedPaths);
  const selectedChangeCount = selectedPaths.length;

  useEffect(() => {
    if (isInspectingCommit) {
      return;
    }

    const availablePaths = snapshot.changes.map((change) => change.path);
    setSelectedCommitPaths((current) => {
      if (!availablePaths.length) {
        return null;
      }
      if (current === null) {
        return availablePaths;
      }
      const currentSet = new Set(current);
      return availablePaths.filter((pathName) => currentSet.has(pathName));
    });
  }, [isInspectingCommit, snapshot.changes]);

  const discardChangePrompt = (change: ChangeEntry): string =>
    change.status.trim() === "??"
      ? `Delete the untracked file "${change.path}"? This cannot be undone.`
      : `Discard all changes in "${change.path}" and restore it from HEAD?`;

  const handleCommit = async () => {
    const message = commitMessage.trim();
    if (!message || isCommitting || selectedChangeCount === 0) {
      return;
    }

    setIsCommitting(true);
    const statusId = statusBar.beginStatus("Creating commit", true);
    try {
      const next = await onCommitChanges(message, selectedPaths);
      if (next) {
        setCommitMessage("");
        setSelectedCommitPaths(null);
      }
    } finally {
      setIsCommitting(false);
      statusBar.endStatus(statusId);
    }
  };

  const handleGenerateCommitMessage = async () => {
    if (isGeneratingCommitMessage || selectedChangeCount === 0) {
      return;
    }

    setIsGeneratingCommitMessage(true);
    const statusId = statusBar.beginStatus("Generating commit message", true);
    try {
      const result = await onGenerateCommitMessage(selectedPaths);
      if (result?.message) {
        setCommitMessage(result.message);
        setGeneratedCommitProvider(result.provider);
      }
    } finally {
      setIsGeneratingCommitMessage(false);
      statusBar.endStatus(statusId);
    }
  };

  const toggleCommitPath = (pathName: string) => {
    setSelectedCommitPaths((current) => {
      const currentPaths = current ?? snapshot.changes.map((change) => change.path);
      const currentSet = new Set(currentPaths);
      if (currentSet.has(pathName)) {
        currentSet.delete(pathName);
      } else {
        currentSet.add(pathName);
      }
      return snapshot.changes.map((change) => change.path).filter((path) => currentSet.has(path));
    });
  };

  const handlePush = async () => {
    if (isPushing) {
      return;
    }

    setIsPushing(true);
    const statusId = statusBar.beginStatus("Pushing branch", true);
    try {
      await onPushChanges();
      onRefreshForge();
      await loadGitStatusSummary();
    } finally {
      setIsPushing(false);
      statusBar.endStatus(statusId);
    }
  };

  const handlePull = async () => {
    if (isPulling) {
      return;
    }

    setIsPulling(true);
    const statusId = statusBar.beginStatus("Pulling branch", true);
    try {
      await onPullChanges();
      onRefreshForge();
      await loadGitStatusSummary();
    } finally {
      setIsPulling(false);
      statusBar.endStatus(statusId);
    }
  };

  const handleCheckoutBranch = async (branch: string) => {
    if (!snapshot.project || isCheckingOutBranch || gitStatusIsDirty || isInspectingCommit) {
      return;
    }

    setIsCheckingOutBranch(true);
    const statusId = statusBar.beginStatus(`Checking out ${branch}`, true);
    try {
      await onCheckoutWorkspaceBranch(branch);
      onRefreshForge();
      await loadGitStatusSummary();
    } finally {
      setIsCheckingOutBranch(false);
      statusBar.endStatus(statusId);
    }
  };

  const handleSetUpstream = async (remoteBranch: string) => {
    if (!snapshot.project || isSettingUpstream) {
      return;
    }

    setIsSettingUpstream(true);
    const statusId = statusBar.beginStatus(`Linking ${activeBranch} to ${remoteBranch}`, true);
    try {
      const summary = await noraWorkspaceClient.setWorkspaceUpstream({
        projectId: snapshot.project.id,
        rootPath: snapshot.changesRoot || undefined,
        remoteBranch
      });
      setGitStatusAheadCount(summary.aheadCount);
      setGitStatusBehindCount(summary.behindCount);
      setGitStatusHasConfiguredUpstream(summary.hasConfiguredUpstream);
      setGitStatusRemoteBranches(summary.remoteBranches);
      setGitStatusIsDirty(summary.lines.length > 0);
    } finally {
      setIsSettingUpstream(false);
      statusBar.endStatus(statusId);
    }
  };

  const handleDiscardChange = async (change: ChangeEntry) => {
    if (discardingChangePath) {
      return;
    }
    const ok = window.confirm(discardChangePrompt(change));
    if (!ok) {
      return;
    }

    setDiscardingChangePath(change.path);
    const statusId = statusBar.beginStatus(`Discarding ${change.path}`, true);
    try {
      await onDiscardChange(change.path);
    } finally {
      setDiscardingChangePath(null);
      statusBar.endStatus(statusId);
    }
  };

  const handleRefreshChanges = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setIsRefreshingChanges(true);
    const statusId = statusBar.beginStatus("Refreshing git changes", true);
    try {
      await onRefreshChangesRef.current();
      await loadGitStatusSummary();
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshingChanges(false);
      statusBar.endStatus(statusId);
    }
  }, [loadGitStatusSummary, statusBar]);

  useEffect(() => {
    void loadGitStatusSummary();
  }, [loadGitStatusSummary]);

  useEffect(() => {
    if (activeTab !== "git" || collapsed || !snapshot.project) {
      return;
    }

    const refreshWhenFocused = () => {
      if (document.visibilityState !== "visible" || !document.hasFocus()) {
        return;
      }
      void handleRefreshChanges();
    };

    const timer = window.setInterval(() => {
      refreshWhenFocused();
    }, 15_000);
    const handleWindowFocus = () => {
      refreshWhenFocused();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshWhenFocused();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    refreshWhenFocused();

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTab, collapsed, snapshot.project?.id, handleRefreshChanges]);

  const commitSubtitle = (entry: CommitHistoryEntry) =>
    `${entry.author} · ${formatCommitTimestamp(entry.authoredAt)} · ${entry.shortHash}`;

  const gitTabPullRequestStatusDot = forgeOverview?.repo?.provider === "github" && activeBranch ? (
    <Tooltip
      content={
        forgeBranchPullRequestStatus?.branchExistsOnRemote === false
          ? "PR status: No pull request (branch not pushed)"
          : forgeBranchPullRequestStatus?.pullRequestNumber
          ? `PR status: ${forgeBranchPullRequestStatus.label} (#${forgeBranchPullRequestStatus.pullRequestNumber})`
          : `PR status: ${forgeBranchPullRequestStatus?.label ?? "No pull request"}`
      }
      side="bottom"
    >
      <span
        className={cn("inline-flex size-2 rounded-full", getPullRequestStatusDotClass(forgeBranchPullRequestStatus?.state ?? "no_pull_request"))}
        aria-label={
          forgeBranchPullRequestStatus?.branchExistsOnRemote === false
            ? "Pull request status: No pull request, branch not pushed"
            : `Pull request status: ${forgeBranchPullRequestStatus?.label ?? "No pull request"}`
        }
      />
    </Tooltip>
  ) : null;

  const headerSummary = (
    activeTab === "git"
                ? (
                    isInspectingCommit
                      ? `${changeCount} file${changeCount === 1 ? "" : "s"} in ${selectedCommit.shortHash}`
                      : changeCount
                        ? `${changeCount} changed file${changeCount === 1 ? "" : "s"}`
                        : "Working tree clean"
                  )
                : activeTab === "files"
                  ? fileCount
                    ? `${fileCount} project file${fileCount === 1 ? "" : "s"}`
                    : "No files available"
                  : activeTab === "instructions"
                    ? "Workspace agent instructions"
                  : activeTab === "memory"
                    ? "Nora’s workspace memories"
                  : activeTab === "vercel"
                    ? linkedVercelProject
                      ? `${vercelDeployments.length} deployment${vercelDeployments.length === 1 ? "" : "s"}`
                      : vercelProjects.length
                        ? `${vercelProjects.length} Vercel project${vercelProjects.length === 1 ? "" : "s"}`
                        : "Vercel projects"
                  : forgeOverview?.repo
                    ? forgeOverview.repo.provider === "github"
                      ? `${forgeOverview.pullRequests.length} PRs · ${forgeOverview.issues.length} issues · ${forgeOverview.workflowRuns.length} runs`
                      : `${forgeOverview.pullRequests.length} PRs · ${forgeOverview.issues.length} issues`
                    : "Forge activity"
  );
  const allChangesSelected = snapshot.changes.length > 0 && selectedChangeCount === snapshot.changes.length;
  const remoteActions = (
    <>
      <SidebarIconAction
        label={isInspectingCommit ? "Return to working tree before pulling" : gitStatusBehindCount > 0 ? `Pull ${gitStatusBehindCount} remote commit${gitStatusBehindCount === 1 ? "" : "s"}` : "No remote changes to pull"}
        icon={<ArrowDown className="size-3.5" aria-hidden="true" />}
        count={gitStatusBehindCount}
        busy={isPulling}
        disabled={!snapshot.project || isInspectingCommit || gitStatusBehindCount < 1}
        onClick={() => void handlePull()}
      />
      <SidebarIconAction
        label={isInspectingCommit ? "Return to working tree before pushing" : gitStatusAheadCount > 0 ? `Push ${gitStatusAheadCount} local commit${gitStatusAheadCount === 1 ? "" : "s"}` : "No local commits to push"}
        icon={<ArrowUp className="size-3.5" aria-hidden="true" />}
        count={gitStatusAheadCount}
        busy={isPushing}
        disabled={!snapshot.project || isInspectingCommit || gitStatusAheadCount < 1}
        onClick={() => void handlePush()}
      />
      <SidebarIconAction
        label={canCreatePullRequest ? `${createPullRequestLabel} from ${activeBranch}` : (createPullRequestDisabledReason ?? `${createPullRequestLabel} unavailable`)}
        icon={<GitPullRequest className="size-3.5" aria-hidden="true" />}
        disabled={!canCreatePullRequest}
        onClick={onOpenCreatePullRequest}
      />
    </>
  );

  return (
    <section className="workspace-shell-surface flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card">
      {!collapsed ? (
        <div className="min-w-0 shrink-0">
          <SidebarTabBar
            ariaLabel="Sidebar sections"
            iconOnlyInactive
            items={availableTabs.map((tab) => ({ id: tab, ...CHANGES_PANEL_TAB_PRESENTATION[tab], indicator: tab === "git" ? gitTabPullRequestStatusDot : null }))}
            active={activeTab}
            onChange={onActiveTabChange}
          />
          {/* The viewer (which checkout this panel reads) sits above the git controls that act on it. */}
          <div className="space-y-2 px-4 py-3 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-muted-foreground">Viewing</span>
              <div className="min-w-0 flex-1">
                <ChangesCheckoutPicker
                  options={changesCheckoutOptions}
                  selectedPath={changesCheckoutPath ?? ""}
                  disabled={!snapshot.project || isCommitting}
                  onSelect={(path) => void onSelectChangesCheckout(path)}
                />
              </div>
              {activeTab === "git" ? (
                <SidebarIconAction
                  label="Refresh git changes"
                  icon={<RefreshCcw className={cn("size-3.5", isRefreshingChanges ? "animate-spin" : "")} aria-hidden="true" />}
                  disabled={isRefreshingChanges}
                  onClick={() => void handleRefreshChanges()}
                />
              ) : null}
            </div>
            {activeTab === "git" ? (
              <div className="flex min-w-0 items-center gap-2">
                <BranchCheckoutMenu
                  activeBranch={activeBranch}
                  checkoutableBranches={checkoutableBranches}
                  blockedReason={branchCheckoutBlockedReason}
                  isCheckingOut={isCheckingOutBranch}
                  onCheckout={(branch) => void handleCheckoutBranch(branch)}
                  triggerClassName="border-transparent bg-muted/60 hover:bg-muted"
                />
                <span className="min-w-0 flex-1 truncate text-right text-muted-foreground">{headerSummary}</span>
                {additionsTotal || deletionsTotal ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums" title={`${additionsTotal} additions, ${deletionsTotal} deletions`}>
                    <span className="text-emerald-500">+{additionsTotal}</span>
                    <span className="text-destructive">−{deletionsTotal}</span>
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">{headerSummary}</span>
                {activeTab === "vercel" ? (
                <div className="flex items-center gap-1 text-muted-foreground" title="Linked Vercel project">
                  <VercelMark className="size-3.5" />
                  <span>{linkedVercelProject?.name || (vercelToken.trim() ? "connected" : "disconnected")}</span>
                </div>
              ) : null}
              </div>
            )}
          </div>
          {activeTab === "git" ? (
            <div className="border-t border-border/50 pb-1">
              {isInspectingCommit ? (
                <div className="space-y-2 px-4 pt-3">
                  <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted/70 text-muted-foreground">
                      <History className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[12.5px] font-medium leading-snug" title={selectedCommit.subject}>{selectedCommit.subject}</p>
                      <p className="mt-0.5 break-words text-[11px] text-muted-foreground" title={commitSubtitle(selectedCommit)}>{commitSubtitle(selectedCommit)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => void onClearCommitInspection()}>
                    <Undo2 className="size-3.5" aria-hidden="true" />
                    Back to working tree
                  </Button>
                </div>
              ) : (
                <div className="px-4 pt-3">
                  <CommitComposer
                    message={commitMessage}
                    committing={isCommitting}
                    canCommit={snapshot.changes.length > 0 && selectedChangeCount > 0 && !!commitMessage.trim()}
                    selectionLabel={`${selectedChangeCount} of ${snapshot.changes.length} file${snapshot.changes.length === 1 ? "" : "s"}${generatedCommitProvider ? ` · ${generatedCommitProvider}` : ""}`}
                    ai={canGenerateAiCommitMessage ? {
                      generating: isGeneratingCommitMessage,
                      disabled: selectedChangeCount === 0 || isCommitting,
                      onGenerate: () => void handleGenerateCommitMessage()
                    } : null}
                    actions={remoteActions}
                    notice={!gitStatusHasConfiguredUpstream && activeBranch ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                        <div className="min-w-0 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{activeBranch}</span> has no upstream branch.
                        </div>
                        <DropdownMenu
                          align="end"
                          widthClassName="w-64"
                          trigger={(
                            <Button
                              variant="outline"
                              className="h-7 shrink-0 gap-1.5 px-2 text-[11px]"
                              disabled={isSettingUpstream || gitStatusRemoteBranches.length === 0}
                              tooltip={
                                gitStatusRemoteBranches.length
                                  ? "Choose a remote branch to track"
                                  : "No remote branches are available"
                              }
                            >
                              {isSettingUpstream ? <LoaderCircle className="size-3.5 animate-spin" /> : <GitBranch className="size-3.5" />}
                              <span>{isSettingUpstream ? "Linking" : "Set upstream"}</span>
                            </Button>
                          )}
                        >
                          {gitStatusRemoteBranches.map((remoteBranch) => (
                            <DropdownMenuItem
                              key={remoteBranch}
                              onSelect={() => void handleSetUpstream(remoteBranch)}
                            >
                              <GitBranch className="size-4" />
                              <span className="truncate">{remoteBranch}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenu>
                      </div>
                    ) : null}
                    onMessageChange={setCommitMessage}
                    onCommit={() => void handleCommit()}
                  />
                </div>
              )}
              <SidebarSectionHeader
                title="Recent commits"
                count={snapshot.commitHistory.length}
                collapse={{ collapsed: isRecentCommitsCollapsed, onToggle: () => setIsRecentCommitsCollapsed((current) => !current) }}
              />
              {isRecentCommitsCollapsed ? null : (
                <div className="max-h-48 overflow-auto px-2 pb-1 pt-1">
                  {snapshot.commitHistory.length ? (
                    snapshot.commitHistory.map((entry) => (
                      <CommitHistoryRow
                        key={entry.hash}
                        entry={entry}
                        timestamp={formatCommitTimestamp(entry.authoredAt)}
                        selected={snapshot.selectedCommitHash === entry.hash}
                        onInspect={(hash) => void onInspectCommit(hash)}
                      />
                    ))
                  ) : (
                    <p className="px-2 py-2 text-xs text-muted-foreground">No commit history available.</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {!collapsed ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeTab === "files" ? (
              <FileTreePanel
                files={filePaths}
                directoryPaths={fileDirectoryPaths}
                changesByPath={fileChangeCounts}
                activePath={activeFilePath}
                isLoading={fileTreeLoading}
                errorMessage={fileTreeErrorMessage}
                searchQuery={fileSearchQuery}
                searchResults={fileSearchResults}
                isSearching={isSearchingFiles}
                isCaseSensitiveSearch={isCaseSensitiveFileSearch}
                onSearchQueryChange={setFileSearchQuery}
              onCaseSensitiveSearchChange={setIsCaseSensitiveFileSearch}
              onOpenFile={onOpenFile}
              onImportImageToDirectory={onImportImageToDirectory}
              onCreateFile={onCreateFile}
              onCreateDirectory={onCreateDirectory}
              onRenameFile={onRenameFile}
              onDeleteFile={onDeleteFile}
              />
          ) : activeTab === "instructions" ? (
            <WorkspaceInstructionsPanel />
          ) : activeTab === "memory" ? (
            <WorkspaceMemoryPanel />
          ) : activeTab === "vercel" ? (
            <VercelPanel
              isConnected={!!vercelToken.trim()}
              accountLabel={vercelAccountLabel}
              projects={vercelProjects}
              deployments={vercelDeployments}
              linkedProject={linkedVercelProject}
              suggestedProject={suggestedVercelProject}
              isLoadingProjects={vercelProjectsLoading}
              isLoadingDeployments={vercelDeploymentsLoading}
              redeployingDeploymentId={redeployingVercelDeploymentId}
              projectsErrorMessage={vercelProjectsErrorMessage}
              deploymentsErrorMessage={vercelDeploymentsErrorMessage}
              onRefreshProjects={onRefreshVercelProjects}
              onRefreshDeployments={onRefreshVercelDeployments}
              onRedeployDeployment={onRedeployVercelDeployment}
              onOpenUrl={onOpenForgeUrl}
              onOpenSettings={onOpenVercelSettings}
              onLinkProject={onLinkVercelProject}
              onUnlinkProject={onUnlinkVercelProject}
            />
          ) : activeTab === "forge" ? (
            <ForgePanel
              overview={forgeOverview}
              isLoading={forgeLoading}
              resolvedTheme={resolvedTheme}
              detail={forgeDetail}
              detailLoading={forgeDetailLoading}
              detailErrorMessage={forgeDetailErrorMessage}
              actionLoading={forgeActionLoading}
              commentLoading={forgeCommentLoading}
              tools={tools}
              onRefresh={onRefreshForge}
              onOpenUrl={onOpenForgeUrl}
              onOpenInViewer={() => {
                if (!forgeDetail) {
                  return;
                }
                onOpenForgeViewer(forgeDetail.kind, forgeDetail.item);
              }}
              onOpenItem={onOpenForgeItem}
              onOpenWorkflowRun={onOpenForgeWorkflowRun}
              onBackToList={onBackFromForgeItem}
              onRefreshDetail={onRefreshForgeItem}
              onAction={onForgeAction}
              onCommentSubmit={onForgeCommentSubmit}
              onStartIssueThread={onStartIssueThread}
              onSpawnReviewAgent={onSpawnReviewAgent}
            />
          ) : snapshot.changes.length ? (
            <div className="min-h-0 flex-1 overflow-auto border-t border-border/50 pb-3">
              <SidebarSectionHeader
                title={isInspectingCommit ? "Files in commit" : "Changes"}
                count={snapshot.changes.length}
                collapse={{ collapsed: isChangedFilesCollapsed, onToggle: () => setIsChangedFilesCollapsed((current) => !current) }}
                actions={
                  <>
                    {annotationCount > 0 ? <DiffReviewCountBadge count={annotationCount} /> : null}
                    {!isInspectingCommit ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[11px] font-normal text-muted-foreground"
                        onClick={() => setSelectedCommitPaths(allChangesSelected ? [] : snapshot.changes.map((change) => change.path))}
                      >
                        {allChangesSelected ? "Select none" : "Select all"}
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] font-normal text-muted-foreground" onClick={onOpenFullDiff}>
                      Full diff
                    </Button>
                  </>
                }
              />
              {isChangedFilesCollapsed ? null : (
                <div className="px-2 pt-1">
                  {snapshot.changes.map((change) => (
                    <ChangedFileRow
                      key={change.path}
                      change={change}
                      selected={selectedChange?.path === change.path}
                      annotationCount={getAnnotationCountForPath(change.path)}
                      workingTree={isInspectingCommit ? null : {
                        included: selectedPathSet.has(change.path),
                        discarding: discardingChangePath === change.path,
                        onToggleIncluded: () => toggleCommitPath(change.path),
                        onDiscard: () => void handleDiscardChange(change),
                        onEdit: () => onEditChange(change.path)
                      }}
                      onSelect={() => void onSelectChange(change.path)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="border-t border-border/50 px-4 py-8 text-center text-xs text-muted-foreground">
              {isInspectingCommit ? "No diff available for this commit." : "No changes in this checkout."}
            </p>
          )}
          {activeTab === "git" && !isInspectingCommit ? <DiffReviewTray /> : null}
        </div>
      ) : null}
    </section>
  );
}

export function ChangesPanel() {
  const snapshot = useCanonicalAppSnapshot();
  if (!snapshot) {
    return null;
  }

  return <ChangesPanelInner snapshot={snapshot} />;
}
