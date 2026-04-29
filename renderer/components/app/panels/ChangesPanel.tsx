import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import {
  useChangesPanelChrome,
  useChangesPanelFiles,
  useChangesPanelForge,
  useChangesPanelVercel
} from "@/components/app/context/changesPanelContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useStatusBar } from "@/components/app/logic/statusBarContext";
import { FileTreePanel } from "@/components/app/panels/FileTreePanel";
import { ForgePanel } from "@/components/app/panels/ForgePanel";
import { VercelPanel } from "@/components/app/panels/VercelPanel";
import { ForgeProviderIcon } from "@/components/app/views/ForgeProviderIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock3,
  FilePenLine,
  FileText,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  History,
  MessageSquare,
  Minus,
  Plus,
  RefreshCcw,
  Sparkles,
  Undo2,
  User
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

function ChangesPanelInner({ snapshot }: { snapshot: AppState }) {
  const tools = snapshot.agentCatalog;
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
    onBackFromForgeItem,
    onRefreshForgeItem,
    onForgeAction,
    onForgeCommentSubmit,
    onSpawnIssueAgent,
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
    activeFilePath,
    activeBranch,
    selectedChange,
    onActiveTabChange,
    onRefreshChanges,
    onSelectChange,
    onCommitChanges,
    canGenerateAiCommitMessage,
    onGenerateCommitMessage,
    onPushChanges,
    onEditChange,
    onInspectCommit,
    onClearCommitInspection
  } = useChangesPanelChrome();
  const statusBar = useStatusBar();
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isGeneratingCommitMessage, setIsGeneratingCommitMessage] = useState(false);
  const [generatedCommitProvider, setGeneratedCommitProvider] = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [fileSearchResults, setFileSearchResults] = useState<WorkspaceSearchResult[]>([]);
  const [isSearchingFiles, setIsSearchingFiles] = useState(false);
  const [isCaseSensitiveFileSearch, setIsCaseSensitiveFileSearch] = useState(false);
  const [isRecentCommitsCollapsed, setIsRecentCommitsCollapsed] = useState(false);
  const [isChangedFilesCollapsed, setIsChangedFilesCollapsed] = useState(false);
  const [isRefreshingChanges, setIsRefreshingChanges] = useState(false);
  const [selectedCommitPaths, setSelectedCommitPaths] = useState<string[] | null>(null);
  const refreshInFlightRef = useRef(false);
  const onRefreshChangesRef = useRef(onRefreshChanges);
  onRefreshChangesRef.current = onRefreshChanges;

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

  const sourcePath = snapshot.changesRoot || snapshot.project?.rootPath || "No repository selected";
  const selectedCommit = snapshot.selectedCommit;
  const isInspectingCommit = !!selectedCommit;
  const forgeProvider = forgeOverview?.repo?.provider ?? null;
  const changeCount = snapshot.changes.length;
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

  const changeGlyph = (status: ChangeEntry["status"]) => {
    switch (status) {
      case "added":
        return "A";
      case "deleted":
        return "D";
      case "modified":
        return "M";
      case "renamed":
        return "R";
      case "copied":
        return "C";
      default:
        return "*";
    }
  };

  const changeTone = (status: ChangeEntry["status"]) => {
    switch (status) {
      case "added":
        return "text-emerald-500";
      case "deleted":
        return "text-destructive";
      case "modified":
        return "text-primary";
      case "renamed":
      case "copied":
        return "text-amber-500";
      default:
        return "text-muted-foreground";
    }
  };

  const canEditChange = (change: ChangeEntry) =>
    change.status !== "deleted" &&
    !change.path.includes(" -> ");

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
    } finally {
      setIsPushing(false);
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
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshingChanges(false);
      statusBar.endStatus(statusId);
    }
  }, [statusBar]);

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
  const activeSidebarTabClass = resolvedTheme === "dark"
    ? "bg-accent/70 text-foreground"
    : "bg-muted text-foreground";

  return (
    <Card className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-x-0 bg-card/95 shadow-none", collapsed && "changes-sidebar-collapsed-surface")}>
      {!collapsed ? (
        <CardHeader className="border-b border-border/60 px-0 py-2">
          <div className="mb-2 flex items-center gap-3 px-4">
            <div className="min-w-0 flex-1">
              <div className="flex w-full items-center rounded-[4px] border border-border/60 bg-background/40 p-1">
                <button
                  type="button"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-[3px] px-3 py-1.5 text-xs font-medium transition",
                    activeTab === "git" ? activeSidebarTabClass : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onActiveTabChange("git")}
                >
                  <FolderGit2 className="size-3.5" />
                  Git
                  {forgeOverview?.repo?.provider === "github" && activeBranch ? (
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
                  ) : null}
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-[3px] px-3 py-1.5 text-xs font-medium transition",
                    activeTab === "files" ? activeSidebarTabClass : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onActiveTabChange("files")}
                >
                  <FileText className="size-3.5" />
                  Files
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-[3px] px-3 py-1.5 text-xs font-medium transition",
                    activeTab === "vercel" ? activeSidebarTabClass : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onActiveTabChange("vercel")}
                >
                  <VercelMark className="size-3.5" />
                  Vercel
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-[3px] px-3 py-1.5 text-xs font-medium transition",
                    activeTab === "forge" ? activeSidebarTabClass : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onActiveTabChange("forge")}
                >
                  <GitBranch className="size-3.5" />
                  Forge
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-3 px-4">
            <CardTitle className="text-base font-semibold">
              {activeTab === "git"
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
                    : "Forge activity"}
            </CardTitle>
            <div
              className={cn(
                "grid items-center gap-2 border-y border-border/50 py-2 text-xs",
                activeTab === "git" ? "grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto]"
              )}
            >
              <div className="group relative min-w-0">
                <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <GitBranch className="size-3.5 shrink-0" />
                  <span className="truncate">{sourcePath}</span>
                </div>
                <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden rounded-[4px] border border-border/70 bg-popover/95 px-3 py-2 text-[11px] leading-5 text-popover-foreground shadow-xl backdrop-blur group-hover:block">
                  {sourcePath}
                </div>
              </div>
              {activeTab === "git" ? (
                <>
                  <div
                    className="flex items-center gap-1.5 rounded-[4px] border border-border/60 bg-background/60 px-2 py-1 text-foreground"
                    title={activeBranch ? `Active branch: ${activeBranch}` : "Active branch unavailable"}
                  >
                    <GitBranch className="size-3.5 shrink-0 text-primary" />
                    <span className="max-w-[140px] truncate font-medium">{activeBranch || "unknown branch"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground" title={`${additionsTotal} additions`}>
                    <Plus className="size-3.5 text-emerald-500" />
                    <span>{additionsTotal}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground" title={`${deletionsTotal} deletions`}>
                    <Minus className="size-3.5 text-destructive" />
                    <span>{deletionsTotal}</span>
                  </div>
                <div className="flex items-center gap-1 text-muted-foreground" title={`${changeCount} tracked files`}>
                  <FileText className="size-3.5" />
                  <span>{changeCount}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => void handleRefreshChanges()}
                  aria-label="Refresh git changes"
                  disabled={isRefreshingChanges}
                  title="Refresh git changes"
                >
                  <RefreshCcw className={cn("size-3.5", isRefreshingChanges ? "animate-spin" : "")} />
                </Button>
              </>
              ) : activeTab === "files" ? (
                <div className="flex items-center gap-1 text-muted-foreground" title={`${fileCount} project files`}>
                  <FileText className="size-3.5" />
                  <span>{fileCount}</span>
                </div>
              ) : activeTab === "vercel" ? (
                <div className="flex items-center gap-1 text-muted-foreground" title="Linked Vercel project">
                  <VercelMark className="size-3.5" />
                  <span>{linkedVercelProject?.name || (vercelToken.trim() ? "connected" : "disconnected")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground" title="Detected forge provider">
                  {forgeProvider ? <ForgeProviderIcon provider={forgeProvider} className="size-3.5" /> : <GitPullRequest className="size-3.5" />}
                  <span>{forgeOverview?.repo?.provider || "none"}</span>
                </div>
              )}
            </div>

            {activeTab === "git" ? (
              <>
                {isInspectingCommit ? (
                  <div className="grid gap-2 border-b border-border/50 pb-3">
                    <div className="flex items-start gap-2">
                      <div className="grid h-9 w-9 shrink-0 place-items-center border border-border/60 bg-background/50 text-muted-foreground">
                        <History className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium" title={selectedCommit.subject}>
                          {selectedCommit.subject}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-muted-foreground" title={commitSubtitle(selectedCommit)}>
                          {commitSubtitle(selectedCommit)}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="h-9 justify-start gap-2" onClick={() => void onClearCommitInspection()}>
                      <Undo2 className="size-4" />
                      <span className="text-xs font-medium uppercase tracking-[0.14em]">Back to working tree</span>
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 shrink-0 place-items-center border border-border/60 bg-background/50 text-muted-foreground">
                        <MessageSquare className="size-4" />
                      </div>
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Input
                          value={commitMessage}
                          onChange={(event) => setCommitMessage(event.target.value)}
                          onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                              event.preventDefault();
                              void handleCommit();
                            }
                          }}
                          placeholder="Write commit message"
                          className="h-9"
                        />
                        {canGenerateAiCommitMessage ? (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            disabled={selectedChangeCount === 0 || isGeneratingCommitMessage || isCommitting}
                            onClick={() => void handleGenerateCommitMessage()}
                            tooltip={isGeneratingCommitMessage ? "Generating commit message with AI" : "Generate commit message with AI"}
                            aria-label={isGeneratingCommitMessage ? "Generating commit message with AI" : "Generate commit message with AI"}
                          >
                            <Sparkles className={`size-4 ${isGeneratingCommitMessage ? "animate-pulse" : ""}`} />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="default"
                        className="h-9 justify-start gap-2"
                        disabled={!snapshot.changes.length || selectedChangeCount === 0 || !commitMessage.trim() || isCommitting}
                        onClick={() => void handleCommit()}
                        title="Create commit"
                      >
                        {isCommitting ? null : <FileText className="size-4" />}
                        <span className="text-xs font-medium uppercase tracking-[0.14em]">{isCommitting ? "Working" : "Commit"}</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 justify-start gap-2"
                        disabled={!snapshot.project || isPushing || isInspectingCommit}
                        onClick={() => void handlePush()}
                        title="Push branch"
                      >
                        {isPushing ? null : <ArrowUp className="size-4" />}
                        <span className="text-xs font-medium uppercase tracking-[0.14em]">{isPushing ? "Working" : "Push"}</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 justify-start gap-2"
                        disabled={!canCreatePullRequest}
                        onClick={canCreatePullRequest ? onOpenCreatePullRequest : undefined}
                        title={canCreatePullRequest ? `${createPullRequestLabel} from ${activeBranch}` : (createPullRequestDisabledReason ?? `${createPullRequestLabel} unavailable`)}
                      >
                        <GitPullRequest className="size-4" />
                        <span className="text-xs font-medium uppercase tracking-[0.14em]">{createPullRequestLabel}</span>
                      </Button>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {selectedChangeCount} of {snapshot.changes.length} file{snapshot.changes.length === 1 ? "" : "s"} selected for commit
                      {generatedCommitProvider ? ` · Generated with ${generatedCommitProvider}` : ""}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      <History className="size-3.5" />
                      Recent commits
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] text-muted-foreground">{snapshot.commitHistory.length}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setIsRecentCommitsCollapsed((current) => !current)}
                        aria-label={isRecentCommitsCollapsed ? "Expand recent commits section" : "Collapse recent commits section"}
                      >
                        {isRecentCommitsCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                      </Button>
                    </div>
                  </div>
                  {isRecentCommitsCollapsed ? null : (
                    <div className="max-h-44 overflow-auto border-y border-border/50 bg-background/20">
                      <div className="divide-y divide-border/40">
                        {snapshot.commitHistory.length ? (
                          snapshot.commitHistory.map((entry) => (
                            <button
                              key={entry.hash}
                              className={cn(
                                "block w-full px-0 text-left transition hover:bg-accent/25",
                                snapshot.selectedCommitHash === entry.hash ? "bg-primary/10" : ""
                              )}
                              onClick={() => void onInspectCommit(entry.hash)}
                              title={`${entry.subject}\n${entry.author}\n${entry.shortHash} · ${formatCommitTimestamp(entry.authoredAt)}`}
                            >
                              <div className="flex items-start gap-3 px-3 py-2.5">
                                <div className="grid h-8 w-8 shrink-0 place-items-center border border-border/50 bg-background/55 text-muted-foreground">
                                  <GitBranch className="size-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium">{entry.subject}</div>
                                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <User className="size-3" />
                                      <span className="truncate">{entry.author}</span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      <Clock3 className="size-3" />
                                      <span>{formatCommitTimestamp(entry.authoredAt)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="shrink-0 text-[11px] font-medium text-muted-foreground">{entry.shortHash}</div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-sm text-muted-foreground">No commit history available.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </CardHeader>
      ) : null}

      {collapsed ? (
        <CardContent className="flex h-full min-h-0 flex-col items-center gap-3 px-2 py-4">
          {activeTab === "git"
            ? <FolderGit2 className="size-4 text-primary" />
              : activeTab === "files"
                ? <FileText className="size-4 text-primary" />
              : activeTab === "vercel"
                ? <VercelMark className="size-4 text-primary" />
              : forgeProvider
                ? <ForgeProviderIcon provider={forgeProvider} className="size-4 text-primary" />
                : <GitPullRequest className="size-4 text-primary" />}
          <div className="border border-border/70 px-2 py-1 text-xs text-muted-foreground">
            {activeTab === "git"
              ? changeCount
              : activeTab === "files"
                ? fileCount
                : activeTab === "vercel"
                  ? linkedVercelProject
                    ? vercelDeployments.length
                    : vercelProjects.length
                  : (forgeOverview?.pullRequests?.length || 0) + (forgeOverview?.issues?.length || 0) + (forgeOverview?.workflowRuns?.length || 0)}
          </div>
        </CardContent>
      ) : (
        <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
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
              onBackToList={onBackFromForgeItem}
              onRefreshDetail={onRefreshForgeItem}
              onAction={onForgeAction}
              onCommentSubmit={onForgeCommentSubmit}
              onSpawnIssueAgent={onSpawnIssueAgent}
            />
          ) : snapshot.changes.length ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="border-b border-border/40 px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <FolderGit2 className="size-3.5" />
                    Changed files
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => setSelectedCommitPaths(snapshot.changes.map((change) => change.path))}
                      disabled={!snapshot.changes.length}
                    >
                      Select all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => setSelectedCommitPaths([])}
                      disabled={!snapshot.changes.length}
                    >
                      Select none
                    </Button>
                    <div className="text-[11px] text-muted-foreground">{snapshot.changes.length}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => setIsChangedFilesCollapsed((current) => !current)}
                      aria-label={isChangedFilesCollapsed ? "Expand changed files section" : "Collapse changed files section"}
                    >
                      {isChangedFilesCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              {isChangedFilesCollapsed ? null : (
                <div>
                  {snapshot.changes.map((change) => (
                    <div
                      key={change.path}
                      className={cn(
                        "border-l-2 px-4 py-3 transition",
                        selectedChange?.path === change.path
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:bg-accent/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <label
                          className="grid size-5 shrink-0 place-items-center"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="size-3.5 rounded-[4px] border border-input bg-background"
                            checked={selectedPathSet.has(change.path)}
                            onChange={() => toggleCommitPath(change.path)}
                            aria-label={`Include ${change.path} in commit`}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void onSelectChange(change.path)}
                          title={change.path}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className={cn("w-4 shrink-0 text-xs font-semibold uppercase", changeTone(change.status))}>
                            {changeGlyph(change.status)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{change.path}</div>
                            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                              <div className="uppercase tracking-[0.12em]">{change.status}</div>
                              <div className="flex items-center gap-1">
                                <Plus className="size-3 text-emerald-500" />
                                <span>{change.additions}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Minus className="size-3 text-destructive" />
                                <span>{change.deletions}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                        {canEditChange(change) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            tooltip="Edit file"
                            onClick={() => onEditChange(change.path)}
                            aria-label={`Edit ${change.path}`}
                          >
                            <FilePenLine className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="m-3 border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
              {isInspectingCommit ? "No diff available for this commit." : "The focused worktree is clean right now."}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function ChangesPanel() {
  const snapshot = useCanonicalAppSnapshot();
  if (!snapshot) {
    return null;
  }

  return <ChangesPanelInner snapshot={snapshot} />;
}
