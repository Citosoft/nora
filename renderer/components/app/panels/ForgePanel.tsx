import { formatDiffPreview, getInlineCommentKey, parseDiffLines, splitForgeComments } from "@/components/app/logic/forgePanelDiff";
import { resolveForgeWorkflowRunBadgeVariant } from "@/components/app/logic/forgeWorkflowRunUi";
import { diffLineClass } from "@/components/app/logic/utils";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { ForgeDetailPanelProps, ForgePanelProps } from "@/components/app/types/component.types";
import { ForgeProviderIcon } from "@/components/app/views/ForgeProviderIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isAgentToolAvailable } from "@shared/agentToolState";
import type {
  AgentCatalogEntry,
  ForgeOverview,
  ForgeWorkflowRunSummary,
  ForgeWorkItemKind,
  ForgeWorkItemSummary
} from "@shared/appTypes";
import { Activity, ArrowLeft, ExternalLink, FileDiff, GitPullRequest, MessageSquare, Plus, RefreshCcw, Tags } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ForgeListTab = "pull_requests" | "issues" | "actions";
type ForgeProviderTab = "github" | "gitlab";
type ForgeMergeRequestScopeTab = "project" | "global";
const ACTIONS_POLL_INTERVAL_MS = 15000;

function getCommentInitials(author: string | null): string {
  const normalized = (author || "?").trim();
  if (!normalized) {
    return "?";
  }

  const parts = normalized.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return normalized.slice(0, 2).toUpperCase();
}

function getWorkflowRunLabel(run: ForgeWorkflowRunSummary): string {
  if (run.conclusion) {
    return run.conclusion;
  }
  return run.status;
}

function getWorkflowRunBadgeVariant(run: ForgeWorkflowRunSummary): "success" | "warning" | "destructive" | "outline" {
  return resolveForgeWorkflowRunBadgeVariant(run.conclusion, run.status);
}

function isWorkflowRunActive(run: ForgeWorkflowRunSummary): boolean {
  const label = getWorkflowRunLabel(run).toLowerCase();
  return label === "queued" || label === "in_progress" || label === "pending" || label === "requested" || label === "waiting";
}

function ActiveWorkflowRunBadge({ label }: { label: string }) {
  return (
    <Badge
      variant="warning"
      className="shrink-0 self-center capitalize"
      title={label}
      aria-label={label}
    >
      <span className="relative mr-1.5 inline-flex size-2 items-center justify-center">
        <span className="absolute inline-flex size-2 animate-ping rounded-full bg-amber-500/60 dark:bg-amber-300/70" />
        <span className="relative inline-flex size-2 rounded-full bg-amber-600 dark:bg-amber-300" />
      </span>
      {label}
    </Badge>
  );
}

function ForgeWorkItemList({
  items,
  kind,
  emptyLabel,
  onOpenItem,
  onOpenUrl
}: {
  items: ForgeWorkItemSummary[];
  kind?: ForgeWorkItemKind;
  emptyLabel: string;
  onOpenItem?: (kind: ForgeWorkItemKind, item: ForgeWorkItemSummary) => void;
  onOpenUrl?: (url: string) => void;
}) {
  if (!items.length) {
    return (
      <div className="rounded-[6px] border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const groupedItems = items.reduce<Array<{ monthKey: string; monthLabel: string; items: ForgeWorkItemSummary[] }>>((groups, item) => {
    const updatedAt = new Date(item.updatedAt);
    const monthKey = Number.isNaN(updatedAt.getTime())
      ? "unknown"
      : `${updatedAt.getUTCFullYear()}-${String(updatedAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const monthLabel = Number.isNaN(updatedAt.getTime()) ? "Unknown Month" : monthFormatter.format(updatedAt);
    const existingGroup = groups.find((group) => group.monthKey === monthKey);
    if (existingGroup) {
      existingGroup.items.push(item);
      return groups;
    }
    groups.push({ monthKey, monthLabel, items: [item] });
    return groups;
  }, []);

  return (
    <div className="space-y-4">
      {groupedItems.map((group) => (
        <section key={group.monthKey} className="space-y-2">
          <div className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {group.monthLabel}
          </div>
          {group.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (kind && onOpenItem) {
                  onOpenItem(kind, item);
                  return;
                }
                if (onOpenUrl) {
                  onOpenUrl(item.webUrl);
                }
              }}
              className="w-full rounded-[6px] border border-border/50 bg-background/50 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent/30"
            >
              <div className="whitespace-normal break-words text-sm font-medium text-foreground">#{item.number} {item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {[item.sourceRepository, item.author || "Unknown", item.state, new Date(item.updatedAt).toLocaleString()].filter(Boolean).join(" · ")}
              </div>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function ForgeWorkflowRunList({
  provider,
  runs,
  onOpenRun
}: {
  provider: ForgeOverview["repo"] extends infer T ? T extends { provider: infer P } ? P : never : never;
  runs: ForgeWorkflowRunSummary[];
  onOpenRun: (run: ForgeWorkflowRunSummary) => void;
}) {
  if (provider !== "github") {
    return (
      <div className="rounded-[6px] border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
        GitHub Actions are only available for GitHub repositories.
      </div>
    );
  }

  if (!runs.length) {
    return (
      <div className="rounded-[6px] border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
        No recent workflow runs.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <button
          key={run.id}
          type="button"
          onClick={() => onOpenRun(run)}
          className="w-full rounded-[6px] border border-border/50 bg-background/50 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="whitespace-normal break-words text-sm font-medium text-foreground">{run.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {[run.branch, run.event, new Date(run.updatedAt).toLocaleString()].filter(Boolean).join(" · ")}
              </div>
            </div>
            {isWorkflowRunActive(run) ? (
              <ActiveWorkflowRunBadge label={getWorkflowRunLabel(run).replace(/_/g, " ")} />
            ) : (
              <Badge variant={getWorkflowRunBadgeVariant(run)} className="shrink-0 self-center capitalize">
                {getWorkflowRunLabel(run).replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

export function ForgePanel(props: ForgePanelProps) {
  const {
    overview,
    isLoading,
    resolvedTheme,
    detail,
    detailLoading,
    detailErrorMessage,
    actionLoading,
    commentLoading,
    tools,
    onRefresh,
    onOpenUrl,
    onOpenInViewer,
    onOpenItem,
    onOpenWorkflowRun,
    onBackToList,
    onRefreshDetail,
    onAction,
    onCommentSubmit,
    onSpawnIssueAgent
  } = props;
  const repo = overview?.repo ?? null;
  const provider = repo?.provider ?? "github";
  const [activeProviderTab, setActiveProviderTab] = useState<ForgeProviderTab>(repo?.provider ?? "github");
  const [activeListTab, setActiveListTab] = useState<ForgeListTab>("pull_requests");
  const [activeMergeRequestScopeTab, setActiveMergeRequestScopeTab] = useState<ForgeMergeRequestScopeTab>("project");
  const activeProviderHasDetectedRepo = repo?.provider === activeProviderTab;
  const gitlabUserMergeRequests = overview?.gitlabUserMergeRequests ?? [];
  const gitlabUserMergeRequestsErrorMessage = overview?.gitlabUserMergeRequestsErrorMessage ?? null;
  const prLabel = activeProviderTab === "gitlab" ? "Merge Requests" : "Pull Requests";
  const prTabLabel = activeProviderTab === "gitlab" ? "MRs" : "Pull Requests";
  const issueLabel = "Issues";

  useEffect(() => {
    setActiveListTab("pull_requests");
    setActiveMergeRequestScopeTab("project");
  }, [repo?.fullName]);

  useEffect(() => {
    if (!repo) {
      return;
    }
    setActiveProviderTab(repo.provider);
  }, [repo?.fullName, repo?.provider]);

  useEffect(() => {
    if (activeProviderTab !== "gitlab") {
      setActiveMergeRequestScopeTab("project");
    }
  }, [activeProviderTab]);

  useEffect(() => {
    if (!repo || repo.provider !== "github" || activeProviderTab !== "github" || detail || activeListTab !== "actions") {
      return;
    }

    const canPoll = (): boolean => document.visibilityState === "visible" && document.hasFocus();
    const poll = (): void => {
      if (!canPoll() || isLoading) {
        return;
      }
      onRefresh();
    };

    const intervalId = window.setInterval(poll, ACTIONS_POLL_INTERVAL_MS);
    const handleVisibilityChange = (): void => {
      if (canPoll()) {
        poll();
      }
    };
    const handleFocus = (): void => {
      poll();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeListTab, activeProviderTab, detail, isLoading, onRefresh, repo]);

  if (detail || detailLoading || detailErrorMessage) {
    return (
      <ForgeDetailPanel
        detail={detail}
        detailLoading={detailLoading}
        detailErrorMessage={detailErrorMessage}
        actionLoading={actionLoading}
        commentLoading={commentLoading}
        resolvedTheme={resolvedTheme}
        tools={tools}
        onOpenUrl={onOpenUrl}
        onOpenInViewer={onOpenInViewer}
        onBackToList={onBackToList}
        onRefreshDetail={onRefreshDetail}
        onAction={onAction}
        onCommentSubmit={onCommentSubmit}
        onSpawnIssueAgent={onSpawnIssueAgent}
        repoFullName={repo?.fullName ?? null}
        repoProvider={provider}
      />
    );
  }

  return (
      <div className="center-column-surface flex h-full min-h-0 flex-col bg-card/95">
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {repo ? <ForgeProviderIcon provider={repo.provider} className="size-4 shrink-0" /> : null}
              <span className="truncate">{repo?.fullName || "Forge"}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{repo ? `${repo.provider} · ${repo.host}` : "Loading forge data"}</div>
          </div>
          <div className="flex items-center gap-2">
            {repo ? (
              <Button variant="outline" size="sm" onClick={() => onOpenUrl(repo.webUrl)}>
                <ExternalLink className="size-4" />
                Open
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>
        {overview?.errorMessage ? <div className="mt-2 text-xs text-destructive">{overview.errorMessage}</div> : null}
      </div>

      <div className="border-b border-border/40 px-4 py-3">
        <Tabs
          value={activeProviderTab}
          onValueChange={(value) => setActiveProviderTab(value as ForgeProviderTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="github" className="justify-center">
              <ForgeProviderIcon provider="github" className="size-3.5" />
              <span>GitHub</span>
            </TabsTrigger>
            <TabsTrigger value="gitlab" className="justify-center">
              <ForgeProviderIcon provider="gitlab" className="size-3.5" />
              <span>GitLab</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeListTab} onValueChange={(value) => setActiveListTab(value as ForgeListTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/40 px-4 py-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pull_requests" className="justify-center">
              <GitPullRequest className="size-3.5" />
              <span>{prTabLabel}</span>
            </TabsTrigger>
            <TabsTrigger value="issues" className="justify-center">
              <MessageSquare className="size-3.5" />
              <span>{issueLabel}</span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="justify-center">
              <Activity className="size-3.5" />
              <span>Actions</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pull_requests" className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeProviderTab === "gitlab" ? (
            <Tabs
              value={activeMergeRequestScopeTab}
              onValueChange={(value) => setActiveMergeRequestScopeTab(value as ForgeMergeRequestScopeTab)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="mb-3 grid w-full grid-cols-2">
                <TabsTrigger value="project" className="justify-center">This project</TabsTrigger>
                <TabsTrigger value="global" className="justify-center">Global</TabsTrigger>
              </TabsList>
              <TabsContent value="project" className="min-h-0 flex-1">
                {activeProviderHasDetectedRepo ? (
                  <ForgeWorkItemList
                    items={overview?.pullRequests ?? []}
                    kind="pull_request"
                    emptyLabel="No open merge requests for this project."
                    onOpenItem={onOpenItem}
                  />
                ) : (
                  <div className="rounded-[6px] border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                    No GitLab remote detected for this workspace.
                  </div>
                )}
              </TabsContent>
              <TabsContent value="global" className="min-h-0 flex-1">
                <ForgeWorkItemList
                  items={gitlabUserMergeRequests}
                  emptyLabel="No open merge requests for your GitLab user."
                  kind="pull_request"
                  onOpenItem={onOpenItem}
                />
                {gitlabUserMergeRequestsErrorMessage ? (
                  <div className="mt-3 text-xs text-destructive">{gitlabUserMergeRequestsErrorMessage}</div>
                ) : null}
              </TabsContent>
            </Tabs>
          ) : activeProviderHasDetectedRepo ? (
            <ForgeWorkItemList
              items={overview?.pullRequests ?? []}
              kind="pull_request"
              emptyLabel={`No open ${prLabel.toLowerCase()}.`}
              onOpenItem={onOpenItem}
            />
          ) : (
            <div className="rounded-[6px] border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
              No GitHub remote detected for this workspace.
            </div>
          )}
        </TabsContent>

        <TabsContent value="issues" className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeProviderHasDetectedRepo ? (
            <ForgeWorkItemList
              items={overview?.issues ?? []}
              kind="issue"
              emptyLabel="No open issues."
              onOpenItem={onOpenItem}
            />
          ) : (
            <div className="rounded-[6px] border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
              No {activeProviderTab === "gitlab" ? "GitLab" : "GitHub"} remote detected for this workspace.
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions" className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeProviderHasDetectedRepo ? (
            <ForgeWorkflowRunList
              provider={provider}
              runs={overview?.workflowRuns ?? []}
              onOpenRun={onOpenWorkflowRun}
            />
          ) : (
            <div className="rounded-[6px] border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
              No {activeProviderTab === "gitlab" ? "GitLab" : "GitHub"} remote detected for this workspace.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function ForgeDetailPanel({
  detail,
  detailLoading,
  detailErrorMessage,
  actionLoading,
  commentLoading,
  resolvedTheme,
  tools,
  onOpenUrl,
  onOpenInViewer,
  onBackToList,
  onRefreshDetail,
  onAction,
  onCommentSubmit,
  onSpawnIssueAgent,
  repoFullName = null,
  repoProvider = "github"
}: ForgeDetailPanelProps) {
  const [commentDraft, setCommentDraft] = useState("");
  const [inlineCommentDraft, setInlineCommentDraft] = useState("");
  const [inlineComposerTarget, setInlineComposerTarget] = useState<{
    key: string;
    path: string;
    oldLine: number | null;
    newLine: number | null;
  } | null>(null);
  const availableTools = useMemo(() => tools.filter((tool) => isAgentToolAvailable(tool)), [tools]);
  const detailProvider: ForgeProviderTab = detail?.item.id.startsWith("gitlab-") ? "gitlab" : repoProvider;
  const pullRequestLabel = detailProvider === "gitlab" ? "Merge Request" : "Pull Request";
  const canOpenDetailInViewer = !!detail && detail.kind === "pull_request" && !!repoFullName && detail.item.sourceRepository === repoFullName;
  const { topLevelComments, inlineCommentsByKey } = useMemo(
    () => splitForgeComments(detail?.comments ?? []),
    [detail?.comments]
  );

  useEffect(() => {
    setCommentDraft("");
    setInlineCommentDraft("");
    setInlineComposerTarget(null);
  }, [detail?.kind, detail?.item.id]);

  return (
    <div className="center-column-surface flex h-full min-h-0 flex-col bg-card/95">
      <div className="border-b border-border/50 px-4 py-3">
        <div className="min-w-0">
          {detail ? (
            <>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <ForgeProviderIcon provider={detailProvider} className="size-3.5 shrink-0" />
                {detail.kind === "pull_request" ? <GitPullRequest className="size-3.5" /> : <MessageSquare className="size-3.5" />}
                <span>{detail.kind === "pull_request" ? pullRequestLabel : "Issue"}</span>
              </div>
              <div className="mt-2 text-lg font-semibold leading-tight text-foreground">
                #{detail.item.number} {detail.item.title}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{detail.item.state}</Badge>
                {detail.item.author ? <Badge variant="outline">{detail.item.author}</Badge> : null}
                <Badge variant="outline">{new Date(detail.item.updatedAt).toLocaleString()}</Badge>
              </div>
              {detail.kind === "issue" ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="mr-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Spawn fix agent
                  </div>
                  {availableTools.map((tool: AgentCatalogEntry) => (
                    <Button
                      key={tool.id}
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      tooltip={`Spawn a new ${tool.label} agent for this issue`}
                      aria-label={`Spawn a new ${tool.label} agent for this issue`}
                      onClick={() => {
                        void onSpawnIssueAgent(tool.id);
                      }}
                      disabled={detailLoading || actionLoading || commentLoading}
                    >
                      <AgentToolIcon
                        toolId={tool.id}
                        label={tool.label}
                        className="size-6 rounded-[4px] bg-transparent"
                        imageClassName="size-5 rounded-[4px]"
                      />
                    </Button>
                  ))}
                  {!availableTools.length ? (
                    <div className="text-sm text-muted-foreground">No detected agent CLIs are available.</div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-lg font-semibold leading-tight text-foreground">Forge item</div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBackToList}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button variant="ghost" size="sm" onClick={onRefreshDetail} disabled={detailLoading || actionLoading}>
            <RefreshCcw className="size-4" />
            Refresh
          </Button>
          {canOpenDetailInViewer && onOpenInViewer ? (
            <Button variant="ghost" size="sm" onClick={onOpenInViewer}>
              Open viewer
            </Button>
          ) : null}
          {detail?.canMerge ? (
            <Button variant="ghost" size="sm" onClick={() => onAction("merge")} disabled={detailLoading || actionLoading}>
              Merge
            </Button>
          ) : null}
          {detail?.canClose ? (
            <Button variant="ghost" size="sm" onClick={() => onAction("close")} disabled={detailLoading || actionLoading}>
              Close
            </Button>
          ) : null}
          {detail?.canReopen ? (
            <Button variant="ghost" size="sm" onClick={() => onAction("reopen")} disabled={detailLoading || actionLoading}>
              Reopen
            </Button>
          ) : null}
          {detail ? (
            <Button variant="ghost" size="sm" onClick={() => onOpenUrl(detail.item.webUrl)}>
              <ExternalLink className="size-4" />
              Open
            </Button>
          ) : null}
        </div>
        {detailErrorMessage ? <div className="mt-3 text-xs text-destructive">{detailErrorMessage}</div> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {detailLoading && !detail ? (
          <div className="text-sm text-muted-foreground">Loading forge item…</div>
        ) : !detail ? (
          <div className="text-sm text-muted-foreground">Unable to load this forge item.</div>
        ) : (
          <div className="space-y-4">
            {detail.labels.length ? (
              <div className="rounded-[8px] border border-border/60 bg-card/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <Tags className="size-3.5" />
                  Labels
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.labels.map((label) => (
                    <Badge key={label} variant="outline">{label}</Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Description
              </div>
              {detail.body.trim() ? (
                <MarkdownRenderer className="space-y-4 text-sm leading-6 text-foreground/90">
                  {detail.body}
                </MarkdownRenderer>
              ) : (
                <div className="text-sm text-muted-foreground">No description provided.</div>
              )}
            </div>

            {detail.kind === "pull_request" ? (
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  <FileDiff className="size-3.5" />
                  Changes
                </div>
                {detail.changes.length ? (
                  <div className="space-y-3">
                    {detail.changes.map((change) => (
                      <div key={change.id} className="rounded-[6px] border border-border/50 bg-background/55 p-3">
                        <div className="mb-2 text-xs text-muted-foreground">
                          {[change.path, `+${change.additions}`, `-${change.deletions}`].join(" · ")}
                          {change.previousPath ? ` · renamed from ${change.previousPath}` : ""}
                        </div>
                        <div className="terminal-text overflow-x-auto whitespace-pre rounded-[4px] border border-border/50 bg-background/70 p-2 text-[11px] leading-5">
                          {parseDiffLines(formatDiffPreview(change.diff)).map((line) => {
                            const inlineKey = getInlineCommentKey(change.path, line.oldLine, line.newLine);
                            const inlineComments = inlineCommentsByKey.get(inlineKey) ?? [];
                            const supportsInlineComments = detail.capabilities?.supportsInlineComments
                              ?? (detailProvider === "gitlab" && detail.kind === "pull_request");
                            const canCommentInline = supportsInlineComments && (line.oldLine !== null || line.newLine !== null);
                            return (
                              <div key={`${change.id}-${line.key}`} className="space-y-1">
                                <div className="group flex items-start gap-2">
                                  <div className="mt-[1px] w-16 shrink-0 text-[10px] text-muted-foreground/80">
                                    {line.oldLine ?? " "} | {line.newLine ?? " "}
                                  </div>
                                  <div className={cn("min-w-0 flex-1 whitespace-pre-wrap break-words px-1", diffLineClass(line.text, resolvedTheme))}>
                                    {line.text || " "}
                                  </div>
                                  {canCommentInline ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-5 opacity-0 transition group-hover:opacity-100"
                                      onClick={() => {
                                        setInlineComposerTarget({
                                          key: inlineKey,
                                          path: change.path,
                                          oldLine: line.oldLine,
                                          newLine: line.newLine
                                        });
                                        setInlineCommentDraft("");
                                      }}
                                      aria-label="Add inline comment"
                                    >
                                      <Plus className="size-3.5" />
                                    </Button>
                                  ) : null}
                                </div>
                                {inlineComments.length ? (
                                  <div className="ml-[4.5rem] space-y-1 rounded-[4px] border border-border/40 bg-background/60 p-2">
                                    {inlineComments.map((comment) => (
                                      <div key={comment.id} className="text-xs">
                                        <div className="text-muted-foreground">
                                          <span className="font-medium text-foreground/90">{comment.author || "Unknown"}</span>
                                          <span className="ml-2">{new Date(comment.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="mt-1 whitespace-pre-wrap text-foreground/85">{comment.body || "(empty)"}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {inlineComposerTarget?.key === inlineKey ? (
                                  <div className="ml-[4.5rem] space-y-2 rounded-[4px] border border-border/50 bg-background/70 p-2">
                                    <Textarea
                                      value={inlineCommentDraft}
                                      onChange={(event) => setInlineCommentDraft(event.target.value)}
                                      placeholder="Write an inline comment"
                                      className="min-h-20 resize-y"
                                      disabled={commentLoading}
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setInlineComposerTarget(null);
                                          setInlineCommentDraft("");
                                        }}
                                        disabled={commentLoading}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={!inlineCommentDraft.trim() || commentLoading}
                                        onClick={() => {
                                          const nextComment = inlineCommentDraft.trim();
                                          if (!nextComment) {
                                            return;
                                          }
                                          void onCommentSubmit({
                                            body: nextComment,
                                            inlineTarget: {
                                              path: inlineComposerTarget.path,
                                              oldLine: inlineComposerTarget.oldLine,
                                              newLine: inlineComposerTarget.newLine
                                            }
                                          }).then(() => {
                                            setInlineComposerTarget(null);
                                            setInlineCommentDraft("");
                                          });
                                        }}
                                      >
                                        {commentLoading ? "Posting" : "Add inline comment"}
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No changed files available.</div>
                )}
              </div>
            ) : null}

            <div className="rounded-[8px] border border-border/60 bg-card/70 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Comments
              </div>
              <div className="mb-4 space-y-3 rounded-[6px] border border-border/50 bg-background/55 p-3">
                <Textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="Write a comment"
                  className="min-h-28 resize-y"
                  disabled={commentLoading}
                />
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!commentDraft.trim() || commentLoading}
                    onClick={() => {
                      const nextComment = commentDraft.trim();
                      if (!nextComment) {
                        return;
                      }
                      void onCommentSubmit({ body: nextComment }).then(() => {
                        setCommentDraft("");
                      });
                    }}
                  >
                    {commentLoading ? "Posting" : "Add comment"}
                  </Button>
                </div>
              </div>
              {topLevelComments.length ? (
                <div className="space-y-3">
                  {topLevelComments.map((comment) => (
                    <div key={comment.id} className="rounded-[6px] border border-border/50 bg-background/60 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="flex min-w-0 items-center gap-2">
                          {comment.authorAvatarUrl ? (
                            <img
                              src={comment.authorAvatarUrl}
                              alt={comment.author ? `${comment.author} avatar` : "Comment author avatar"}
                              className="size-7 shrink-0 rounded-full border border-border/60 object-cover"
                            />
                          ) : (
                            <div className="grid size-7 shrink-0 place-items-center rounded-full border border-border/60 bg-background/80 text-[10px] font-semibold text-foreground/80">
                              {getCommentInitials(comment.author)}
                            </div>
                          )}
                          <span className="truncate font-medium text-foreground/90">{comment.author || "Unknown"}</span>
                        </div>
                        <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      {comment.body.trim() ? (
                        <MarkdownRenderer className="space-y-4 text-sm leading-6 text-foreground/90">
                          {comment.body}
                        </MarkdownRenderer>
                      ) : (
                        <div className="text-sm text-muted-foreground">No comment body provided.</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No comments yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
