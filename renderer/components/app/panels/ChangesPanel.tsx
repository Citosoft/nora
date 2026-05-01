import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import {
  useChangesPanelChrome,
  useChangesPanelFiles,
  useChangesPanelForge,
  useChangesPanelVercel,
  useChangesPanelWorkspace
} from "@/components/app/context/changesPanelContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceAgentContextSources } from "@/components/app/hooks/useWorkspaceAgentContextSources";
import { useWorkspaceExternalHarnessSessions } from "@/components/app/hooks/useWorkspaceExternalHarnessSessions";
import { useStatusBar } from "@/components/app/logic/statusBarContext";
import { formatTimestamp } from "@/components/app/logic/utils";
import { setWorkspaceRelativePathDragData } from "@/components/app/logic/workspacePathDrag";
import { FileTreePanel } from "@/components/app/panels/FileTreePanel";
import { ForgePanel } from "@/components/app/panels/ForgePanel";
import { VercelPanel } from "@/components/app/panels/VercelPanel";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { ForgeProviderIcon } from "@/components/app/views/ForgeProviderIcon";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  AgentContextEntryGroup,
  AgentContextSelection,
  AgentContextSourceSummary,
  AppState,
  ChangeEntry,
  CommitHistoryEntry,
  GithubBranchPullRequestState,
  ExternalHarnessSessionSummary,
  ImportedContextBundleSummary,
  WorkspaceSearchResult
} from "@shared/appTypes";
import {
  ArrowUp,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock3,
  FilePenLine,
  FileText,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  History,
  LoaderCircle,
  MessageSquare,
  Minus,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  Undo2,
  User
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function formatImportedContextFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatImportedContextApproxTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `~${(tokens / 1_000_000).toFixed(1)}M tok`;
  }
  if (tokens >= 10_000) {
    return `~${Math.round(tokens / 1000)}k tok`;
  }
  if (tokens >= 1000) {
    return `~${(tokens / 1000).toFixed(1)}k tok`;
  }
  return `~${tokens} tok`;
}

function compareAgentContextTimestampsDescending(left: string | null, right: string | null): number {
  const leftMs = left ? Date.parse(left) : 0;
  const rightMs = right ? Date.parse(right) : 0;
  return rightMs - leftMs;
}

function buildAgentContextSelectionForGroup(sourceAgentId: string, group: AgentContextEntryGroup): AgentContextSelection[] {
  return [{ sourceAgentId, entryIds: [...group.entryIds] }];
}

type ContextBundleHeadlineFields = {
  displayTarget: string | null;
  primarySourceAgentLabel: string | null;
};

function dedupeContextRowsByMd5<T extends { contentMd5: string | null }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (!row.contentMd5) {
      out.push(row);
      continue;
    }
    if (seen.has(row.contentMd5)) {
      continue;
    }
    seen.add(row.contentMd5);
    out.push(row);
  }
  return out;
}

function importedContextBundleHeadline(entry: ContextBundleHeadlineFields): string {
  if (entry.primarySourceAgentLabel && entry.displayTarget) {
    return `${entry.primarySourceAgentLabel} → ${entry.displayTarget}`;
  }
  if (entry.displayTarget) {
    return entry.displayTarget;
  }
  if (entry.primarySourceAgentLabel) {
    return entry.primarySourceAgentLabel;
  }
  return "Imported context";
}

function buildContextGroupTooltipContent(groupTitle: string): string {
  return `${groupTitle}\n\nClick to start a new agent with this conversation group attached.`;
}

function buildExternalHarnessTooltipContent(sessionLabel: string): string {
  return `${sessionLabel}\n\nClick to start a new agent with this transcript attached.`;
}

function buildImportedBundleTooltipContent(
  headline: string,
  path: string,
  displaySources: string | null
): string {
  const prefix = displaySources ? `${headline}\n${displaySources}\n${path}` : `${headline}\n${path}`;
  return `${prefix}\n\nDrag to an agent terminal to paste the path.`;
}

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
  const { tools, onOpenCreateAgentDialog } = useChangesPanelWorkspace();
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
    onOpenFullDiff,
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
  const [importedBundles, setImportedBundles] = useState<ImportedContextBundleSummary[]>([]);
  const [importedLoading, setImportedLoading] = useState(false);
  const [importedError, setImportedError] = useState<string | null>(null);
  const [agentContextReloadKey, setAgentContextReloadKey] = useState(0);
  const [contextSubTab, setContextSubTab] = useState<"detected" | "imported">("detected");
  const refreshInFlightRef = useRef(false);
  const onRefreshChangesRef = useRef(onRefreshChanges);
  onRefreshChangesRef.current = onRefreshChanges;

  const loadImportedBundles = useCallback(async () => {
    if (!snapshot.project || !snapshot.changesRoot) {
      setImportedBundles([]);
      setImportedError(null);
      return;
    }

    setImportedLoading(true);
    setImportedError(null);
    try {
      const rows = await noraWorkspaceClient.listImportedContextBundles(snapshot.project.id, snapshot.changesRoot);
      setImportedBundles(rows);
    } catch (error: unknown) {
      const detail = error instanceof Error && error.message.trim() ? error.message.trim() : "Could not load imported context files.";
      setImportedError(detail);
      setImportedBundles([]);
    } finally {
      setImportedLoading(false);
    }
  }, [snapshot.changesRoot, snapshot.project]);

  const refreshContextTabLists = useCallback(async () => {
    setAgentContextReloadKey((key) => key + 1);
    await loadImportedBundles();
  }, [loadImportedBundles]);

  useEffect(() => {
    if (activeTab !== "context" || collapsed || !snapshot.project?.id) {
      return;
    }
    void refreshContextTabLists();
  }, [activeTab, collapsed, refreshContextTabLists, snapshot.changesRoot, snapshot.project?.id]);

  const { sources: agentContextSources, isLoading: isAgentContextLoading } = useWorkspaceAgentContextSources(
    snapshot.project?.id ?? null,
    undefined,
    {
      enabled: activeTab === "context" && !collapsed && !!snapshot.project?.id,
      reloadToken: agentContextReloadKey
    }
  );

  const { sessions: externalHarnessSessions, isLoading: isExternalHarnessLoading } = useWorkspaceExternalHarnessSessions(
    snapshot.project?.id ?? null,
    snapshot.changesRoot,
    {
      enabled: activeTab === "context" && !collapsed && !!snapshot.project?.id && !!snapshot.changesRoot,
      reloadToken: agentContextReloadKey
    }
  );

  const [openingExternalHarnessArtifactPath, setOpeningExternalHarnessArtifactPath] = useState<string | null>(null);

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

  const importedBundlesUnique = useMemo(() => dedupeContextRowsByMd5(importedBundles), [importedBundles]);

  const workspaceAgentContextGroupCount = useMemo(
    () => agentContextSources.reduce((total, source) => total + source.entryGroups.length, 0),
    [agentContextSources]
  );

  const detectedContextSurfaceCount = workspaceAgentContextGroupCount + externalHarnessSessions.length;

  const sortedAgentContextSources = useMemo(
    () =>
      [...agentContextSources]
        .sort((left, right) => compareAgentContextTimestampsDescending(left.lastUpdatedAt, right.lastUpdatedAt))
        .map((source) => ({
          ...source,
          entryGroups: [...source.entryGroups].sort((left, right) =>
            compareAgentContextTimestampsDescending(left.lastUpdatedAt, right.lastUpdatedAt)
          )
        })),
    [agentContextSources]
  );

  const contextTabListsLoading = importedLoading || isAgentContextLoading || isExternalHarnessLoading;
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

  const handleOpenCreateAgentFromContextGroup = (source: AgentContextSourceSummary, group: AgentContextEntryGroup) => {
    onOpenCreateAgentDialog({
      contextSelections: buildAgentContextSelectionForGroup(source.agentId, group),
      initialWizardStepIndex: 2
    });
  };

  const handleOpenCreateAgentFromExternalHarness = async (session: ExternalHarnessSessionSummary) => {
    if (!snapshot.project?.id) {
      return;
    }
    setOpeningExternalHarnessArtifactPath(session.primaryArtifactPath);
    try {
      const selections = await noraWorkspaceClient.composeExternalHarnessContextSelections(snapshot.project.id, session);
      if (selections.length > 0) {
        onOpenCreateAgentDialog({
          contextSelections: selections,
          initialWizardStepIndex: 2
        });
      }
    } finally {
      setOpeningExternalHarnessArtifactPath(null);
    }
  };

  const handleDeleteImportedBundle = async (entry: ImportedContextBundleSummary) => {
    if (!snapshot.project?.id || !snapshot.changesRoot) {
      return;
    }
    const ok = window.confirm(`Remove ${entry.fileName} from this worktree?`);
    if (!ok) {
      return;
    }
    const statusId = statusBar.beginStatus("Removing imported context", true);
    try {
      await noraWorkspaceClient.deleteWorkspaceFile({
        projectId: snapshot.project.id,
        path: entry.path,
        rootPath: snapshot.changesRoot
      });
      await refreshContextTabLists();
    } finally {
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
  const activeSidebarTabClass = "bg-muted text-foreground";

  return (
    <section className={cn("flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card/95", collapsed && "changes-sidebar-collapsed-surface")}>
      {!collapsed ? (
        <CardHeader className="min-w-0 border-b border-border/60 px-0 py-2">
          <div className="mb-2 flex items-center gap-3 px-4">
            <div className="min-w-0 flex-1">
              <div className="flex w-full flex-wrap items-center rounded-[4px] border border-border/60 bg-background/40 p-1 sm:flex-nowrap">
                <button
                  type="button"
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[3px] px-2 py-1.5 text-[11px] font-medium transition sm:gap-1.5 sm:px-3 sm:text-xs",
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
                    "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[3px] px-2 py-1.5 text-[11px] font-medium transition sm:gap-1.5 sm:px-3 sm:text-xs",
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
                    "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[3px] px-2 py-1.5 text-[11px] font-medium transition sm:gap-1.5 sm:px-3 sm:text-xs",
                    activeTab === "context" ? activeSidebarTabClass : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => onActiveTabChange("context")}
                  title="Workspace agent context you can attach to a new agent, and files under .nora/imported_context"
                >
                  <Brain className="size-3.5 shrink-0" />
                  <span className="truncate">Context</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[3px] px-2 py-1.5 text-[11px] font-medium transition sm:gap-1.5 sm:px-3 sm:text-xs",
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
                    "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-[3px] px-2 py-1.5 text-[11px] font-medium transition sm:gap-1.5 sm:px-3 sm:text-xs",
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
          <div className="mt-3 min-w-0 space-y-3 px-4">
            <CardTitle className="truncate text-base font-semibold">
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
                  : activeTab === "context"
                    ? contextTabListsLoading && importedBundles.length === 0 && agentContextSources.length === 0
                      ? "Loading context…"
                      : importedError
                        ? "Context"
                        : importedBundlesUnique.length === 0 && workspaceAgentContextGroupCount === 0
                          ? "No context bundles"
                          : `${importedBundlesUnique.length} imported · ${workspaceAgentContextGroupCount} agent groups`
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
              ) : activeTab === "context" ? (
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex items-center gap-1 text-muted-foreground"
                    title={
                      contextSubTab === "detected"
                        ? `${workspaceAgentContextGroupCount} conversation group(s) from other agents in this workspace`
                        : `${importedBundlesUnique.length} unique file(s) under .nora/imported_context`
                    }
                  >
                    <Brain className="size-3.5" />
                    <span className="tabular-nums">
                      {contextSubTab === "detected" ? workspaceAgentContextGroupCount : importedBundlesUnique.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => void refreshContextTabLists()}
                    aria-label="Refresh context lists"
                    disabled={contextTabListsLoading || !snapshot.project}
                    title="Refresh agent context sources and imported bundle list"
                  >
                    <RefreshCcw className={cn("size-3.5", contextTabListsLoading ? "animate-spin" : "")} />
                  </Button>
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
                    <Button variant="outline" className="h-8 justify-start gap-2 rounded-[6px] px-3 text-[11px] font-semibold" onClick={() => void onClearCommitInspection()}>
                      <Undo2 className="size-4" />
                      <span>Back to working tree</span>
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
                          className="h-8 text-[12px]"
                        />
                        {canGenerateAiCommitMessage ? (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
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
                    <div className="grid grid-cols-3 gap-0 rounded-[6px] border border-border/70 bg-background/40">
                      <Button
                        variant="outline"
                        className="button-default-surface h-8 w-full justify-center gap-1.5 rounded-none border-0 border-r border-border/70 px-3 text-[11px] font-semibold tracking-normal"
                        disabled={!snapshot.changes.length || selectedChangeCount === 0 || !commitMessage.trim() || isCommitting}
                        onClick={() => void handleCommit()}
                        tooltip="Create commit"
                      >
                        {isCommitting ? null : <FileText className="size-3.5" />}
                        <span>{isCommitting ? "Working" : "Commit"}</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-full justify-center gap-1.5 rounded-none border-0 border-r border-border/70 px-3 text-[11px] font-semibold tracking-normal"
                        disabled={!snapshot.project || isPushing || isInspectingCommit}
                        onClick={() => void handlePush()}
                        tooltip="Push branch"
                      >
                        {isPushing ? null : <ArrowUp className="size-3.5" />}
                        <span>{isPushing ? "Working" : "Push"}</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 w-full justify-center gap-1.5 rounded-none border-0 px-3 text-[11px] font-semibold tracking-normal"
                        disabled={!canCreatePullRequest}
                        onClick={canCreatePullRequest ? onOpenCreatePullRequest : undefined}
                        tooltip={canCreatePullRequest ? `${createPullRequestLabel} from ${activeBranch}` : (createPullRequestDisabledReason ?? `${createPullRequestLabel} unavailable`)}
                      >
                        <GitPullRequest className="size-3.5" />
                        <span>{createPullRequestLabel}</span>
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
              : activeTab === "context"
                ? <Brain className="size-4 text-primary" />
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
                : activeTab === "context"
                  ? importedBundlesUnique.length + workspaceAgentContextGroupCount
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
          ) : activeTab === "context" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {!snapshot.project ? (
                <div className="m-3 border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
                  Choose a project to browse workspace context.
                </div>
              ) : (
                <Tabs
                  value={contextSubTab}
                  onValueChange={(value) => setContextSubTab(value === "imported" ? "imported" : "detected")}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <div className="shrink-0 border-b border-border/50 px-3 pt-2">
                    <TabsList className="mb-2 h-auto w-full flex-wrap justify-start gap-1">
                      <TabsTrigger value="detected" className="gap-1.5 px-2.5 py-1.5 text-xs">
                        <span>Detected</span>
                        <span className="tabular-nums opacity-80">({detectedContextSurfaceCount})</span>
                      </TabsTrigger>
                      <TabsTrigger value="imported" className="gap-1.5 px-2.5 py-1.5 text-xs">
                        <span>Imported</span>
                        <span className="tabular-nums opacity-80">({importedBundlesUnique.length})</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="relative min-h-0 flex-1 overflow-hidden">
                  <TabsContent
                    value="detected"
                    className="absolute inset-0 m-0 mt-0 overflow-y-auto p-0 focus-visible:outline-none data-[state=inactive]:hidden"
                  >
                    {isAgentContextLoading &&
                    sortedAgentContextSources.length === 0 &&
                    isExternalHarnessLoading &&
                    externalHarnessSessions.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden />
                        Loading agent context
                      </div>
                    ) : (
                      <div className="space-y-5 p-3 pb-6">
                        <section className="space-y-2" aria-labelledby="detected-nora-agents-heading">
                          <h3 id="detected-nora-agents-heading" className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Nora workspace agents
                          </h3>
                          {!sortedAgentContextSources.length ? (
                            <div className="border border-dashed border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
                              No other agents in this workspace have tracked context yet. Launch an agent and send prompts to
                              build shareable conversation groups.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {sortedAgentContextSources.map((source) => (
                                <div
                                  key={source.agentId}
                                  className="rounded-[4px] border border-border/60 bg-card/40"
                                >
                                  <div className="border-b border-border/60 px-3 py-2">
                                    <div className="flex min-w-0 items-stretch gap-2">
                                      <div className="flex shrink-0 items-center" aria-hidden>
                                        <AgentToolIcon
                                          toolId={source.toolId}
                                          label={source.toolLabel}
                                          className="size-8 shrink-0"
                                          imageClassName="size-5 rounded-sm"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-foreground">{source.agentName}</div>
                                        <div className="truncate text-xs text-muted-foreground">
                                          {source.toolLabel} · {formatTimestamp(source.lastUpdatedAt)} · {source.entryCount}{" "}
                                          entr{source.entryCount === 1 ? "y" : "ies"} · {source.estimate.characters.toLocaleString()}{" "}
                                          chars
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-2 p-3">
                                    {source.entryGroups.map((group) => (
                                      <Tooltip key={group.id} content={buildContextGroupTooltipContent(group.title)}>
                                        <button
                                          type="button"
                                          className="w-full rounded-md border border-border/60 bg-background/30 px-2 py-2 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                          aria-label={`New agent with context: ${source.agentName} — ${group.title}`}
                                          onClick={() => handleOpenCreateAgentFromContextGroup(source, group)}
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                                              <span className="text-sm font-medium text-foreground">{group.title}</span>
                                              <span className="text-[11px] text-muted-foreground">
                                                {group.entryCount} entr{group.entryCount === 1 ? "y" : "ies"} · ~
                                                {group.estimate.estimatedTokens.toLocaleString()} tok
                                              </span>
                                            </div>
                                            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                              {formatTimestamp(group.lastUpdatedAt)}
                                            </span>
                                          </div>
                                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{group.latestPreview}</div>
                                        </button>
                                      </Tooltip>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>

                        <section className="space-y-2" aria-labelledby="detected-external-harness-heading">
                          <h3 id="detected-external-harness-heading" className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Local CLI transcripts
                          </h3>
                          <p className="px-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            Codex, Claude, Gemini, and Cursor logs on this machine whose working directory matches this worktree.
                            Remote-only checkouts are skipped.
                          </p>
                          {!snapshot.changesRoot ? (
                            <div className="border border-dashed border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
                              Focus a worktree checkout to scan local harness stores for this folder.
                            </div>
                          ) : isExternalHarnessLoading && externalHarnessSessions.length === 0 ? (
                            <div className="flex items-center gap-2 px-0.5 py-2 text-xs text-muted-foreground">
                              <LoaderCircle className="size-3.5 animate-spin text-primary" aria-hidden />
                              Scanning local CLI sessions
                            </div>
                          ) : !externalHarnessSessions.length ? (
                            <div className="border border-dashed border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
                              No matching local CLI sessions for this worktree path, or every session is already linked to a Nora
                              agent.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {externalHarnessSessions.map((session) => (
                                <Tooltip
                                  key={`${session.toolId}:${session.primaryArtifactPath}`}
                                  content={buildExternalHarnessTooltipContent(session.sessionLabel)}
                                >
                                  <button
                                    type="button"
                                    disabled={openingExternalHarnessArtifactPath === session.primaryArtifactPath}
                                    className="w-full rounded-md border border-border/60 bg-background/30 px-2 py-2 text-left outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
                                    aria-label={`New agent with external CLI context: ${session.sessionLabel}`}
                                    onClick={() => void handleOpenCreateAgentFromExternalHarness(session)}
                                  >
                                    <div className="flex min-w-0 items-stretch gap-2">
                                      <div className="flex shrink-0 items-center" aria-hidden>
                                        <AgentToolIcon
                                          toolId={session.toolId}
                                          label={session.toolLabel}
                                          className="size-8 shrink-0"
                                          imageClassName="size-5 rounded-sm"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="text-sm font-medium text-foreground">{session.sessionLabel}</span>
                                          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                            {formatTimestamp(session.lastUpdatedAt)}
                                          </span>
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                                          {session.entryCount} entr{session.entryCount === 1 ? "y" : "ies"} · ~
                                          {session.estimate.estimatedTokens.toLocaleString()} tok · {session.estimate.characters.toLocaleString()}{" "}
                                          chars
                                        </div>
                                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{session.latestPreview}</div>
                                      </div>
                                      {openingExternalHarnessArtifactPath === session.primaryArtifactPath ? (
                                        <LoaderCircle className="mt-1 size-4 shrink-0 animate-spin text-primary" aria-hidden />
                                      ) : null}
                                    </div>
                                  </button>
                                </Tooltip>
                              ))}
                            </div>
                          )}
                        </section>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent
                    value="imported"
                    className="absolute inset-0 m-0 mt-0 overflow-y-auto p-0 focus-visible:outline-none data-[state=inactive]:hidden"
                  >
                    {!snapshot.changesRoot ? (
                      <div className="m-3 border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
                        Focus a worktree checkout to list files under{" "}
                        <span className="font-mono text-[11px]">.nora/imported_context</span> for that checkout.
                      </div>
                    ) : (
                      <>
                    <div className="px-4 pb-2 pt-1">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Files under{" "}
                        <span className="font-mono text-[10px] text-foreground/80">.nora/imported_context</span> in this
                        worktree. Use the <span className="font-medium text-foreground/90">Detected</span> tab to attach
                        conversation context when starting a new agent.
                      </p>
                    </div>
                    {importedError ? (
                      <div className="m-3 border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{importedError}</div>
                    ) : importedLoading && importedBundles.length === 0 ? (
                      <div className="px-4 pb-4 text-sm text-muted-foreground">Loading imported bundles…</div>
                    ) : importedBundlesUnique.length === 0 ? (
                      <div className="m-3 border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
                        No files in{" "}
                        <span className="font-mono text-[11px]">.nora/imported_context</span>
                        . Bundles appear here when you share context into an agent launched in this worktree.
                      </div>
                    ) : (
                      <ul className="divide-y divide-border/50">
                        {importedBundlesUnique.map((entry) => (
                          <li key={entry.path} className="flex items-stretch gap-1 px-2 py-2 sm:items-start">
                            <Tooltip
                              content={buildImportedBundleTooltipContent(
                                importedContextBundleHeadline(entry),
                                entry.path,
                                entry.displaySources
                              )}
                            >
                              <button
                                type="button"
                                draggable
                                className="min-w-0 flex-1 cursor-grab rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:cursor-grabbing"
                                aria-label={`Open markdown preview: ${importedContextBundleHeadline(entry)}. Drag to an agent terminal to paste the file path.`}
                                onDragStart={(event) => {
                                  setWorkspaceRelativePathDragData(event.dataTransfer, entry.path, "file");
                                }}
                                onClick={() => onOpenFile(entry.path)}
                              >
                                <div className="truncate text-sm font-medium text-foreground">{importedContextBundleHeadline(entry)}</div>
                                {entry.displaySources && entry.extraSourceAgentCount > 0 ? (
                                  <div className="mt-0.5 truncate text-xs text-muted-foreground" title={entry.displaySources}>
                                    Contributors: {entry.displaySources}
                                  </div>
                                ) : null}
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                  {entry.approxEstimatedTokens != null ? (
                                    <span title="Rough size (~characters ÷ 4), same as context estimates elsewhere">
                                      {formatImportedContextApproxTokens(entry.approxEstimatedTokens)}
                                    </span>
                                  ) : null}
                                  <span title={entry.handoffCreatedAt ? "Handoff time (from bundle)" : "Last saved"}>
                                    {entry.handoffCreatedAt
                                      ? formatCommitTimestamp(entry.handoffCreatedAt)
                                      : entry.updatedAt
                                        ? formatCommitTimestamp(entry.updatedAt)
                                        : "Remote / unknown"}
                                  </span>
                                  <span title="File size">{entry.sizeBytes > 0 ? formatImportedContextFileSize(entry.sizeBytes) : "—"}</span>
                                </div>
                                <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/80" title={entry.path}>
                                  {entry.fileName}
                                </div>
                              </button>
                            </Tooltip>
                            <div className="flex shrink-0 self-start pt-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                tooltip="Delete imported file"
                                aria-label={`Delete ${importedContextBundleHeadline(entry)}`}
                                onClick={() => void handleDeleteImportedBundle(entry)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                      </>
                    )}
                  </TabsContent>
                  </div>
                </Tabs>
              )}
            </div>
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
              onSpawnIssueAgent={onSpawnIssueAgent}
            />
          ) : snapshot.changes.length ? (
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="border-b border-border/40 px-4 py-2.5">
                <div className="flex min-w-0 flex-nowrap items-center gap-2">
                  <div className="flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <FolderGit2 className="size-3.5 shrink-0" />
                    <span className="whitespace-nowrap">Changed</span>
                  </div>
                  <div className="min-h-6 min-w-0 flex-1 overflow-x-auto">
                    <div className="flex w-max min-w-0 items-center justify-end gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 shrink-0 px-2 text-[11px]"
                        onClick={onOpenFullDiff}
                        disabled={!snapshot.changes.length}
                      >
                        Open full diff
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 shrink-0 px-2 text-[11px]"
                        onClick={() => setSelectedCommitPaths(snapshot.changes.map((change) => change.path))}
                        disabled={!snapshot.changes.length}
                      >
                        Select all
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 shrink-0 px-2 text-[11px]"
                        onClick={() => setSelectedCommitPaths([])}
                        disabled={!snapshot.changes.length}
                      >
                        Select none
                      </Button>
                      <div className="flex shrink-0 items-center px-0.5 text-[11px] tabular-nums text-muted-foreground">
                        {snapshot.changes.length}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={() => setIsChangedFilesCollapsed((current) => !current)}
                        aria-label={isChangedFilesCollapsed ? "Expand changed section" : "Collapse changed section"}
                      >
                        {isChangedFilesCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                      </Button>
                    </div>
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

