import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { readStoredGithubToken, readStoredGitlabHost, readStoredGitlabToken } from "@/components/app/logic/appPersistence";
import {
  forgeWorkflowRunHasInFlightItems,
  formatForgeWorkflowDurationOnlyLine,
  formatForgeWorkflowTimingLine,
  getForgeWorkflowTimingParts
} from "@/components/app/logic/formatForgeWorkflowRunTiming";
import { resolveForgeWorkflowRunBadgeVariant } from "@/components/app/logic/forgeWorkflowRunUi";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ForgeWorkflowRunDetail } from "@shared/appTypes";
import { Check, CheckCircle2, ChevronRight, Clock3, ExternalLink, GitBranch, LoaderCircle, X, XCircle, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function ForgeWorkflowRunPanel({
  projectId,
  runId,
  onOpenUrl
}: {
  projectId: string;
  runId: number;
  onOpenUrl?: (url: string) => void;
}) {
  const [detail, setDetail] = useState<ForgeWorkflowRunDetail | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const statusLabel = useMemo(() => (detail?.conclusion ?? detail?.status ?? "unknown").replace(/_/g, " "), [detail]);
  const selectedJob = useMemo(
    () => detail?.jobs.find((job) => job.id === selectedJobId) ?? detail?.jobs[0] ?? null,
    [detail?.jobs, selectedJobId]
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const runBadgeVariant = useMemo(
    () => (detail ? resolveForgeWorkflowRunBadgeVariant(detail.conclusion, detail.status) : "outline"),
    [detail]
  );

  useEffect(() => {
    if (!detail || !forgeWorkflowRunHasInFlightItems(detail)) {
      return;
    }
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [detail]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    void noraIntegrationClient
      .getForgeWorkflowRunDetail(projectId, runId, {
        githubToken: readStoredGithubToken(),
        gitlabToken: readStoredGitlabToken(),
        gitlabHost: readStoredGitlabHost()
      })
      .then((next) => {
        if (!mounted) {
          return;
        }
        setDetail(next);
        setSelectedJobId(next.jobs[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Unable to load workflow run details.");
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [projectId, runId]);

  const renderTimingMuted = (startedAt: string | null, completedAt: string | null, status: string) => {
    const line = formatForgeWorkflowTimingLine(getForgeWorkflowTimingParts(startedAt, completedAt, status, nowMs));
    if (!line) {
      return null;
    }
    return <span className="mt-1 block text-xs tabular-nums leading-relaxed text-muted-foreground">{line}</span>;
  };

  const getStepDurationText = (startedAt: string | null, completedAt: string | null, status: string): string | null =>
    formatForgeWorkflowDurationOnlyLine(getForgeWorkflowTimingParts(startedAt, completedAt, status, nowMs));

  return (
    <div className="center-column-surface flex h-full min-h-0 flex-col bg-white dark:bg-transparent">
      <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden />
            <span>Loading workflow run…</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            className="rounded-[6px] border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {detail ? (
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
            <header className="shrink-0 space-y-3 border-b border-border/50 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">{detail.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    {detail.branch ? (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted/55 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                        <GitBranch className="size-3 shrink-0 opacity-70" aria-hidden />
                        <span className="truncate">{detail.branch}</span>
                      </span>
                    ) : null}
                    {detail.event ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted/55 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                        <Zap className="size-3 shrink-0 opacity-70" aria-hidden />
                        {detail.event.replace(/_/g, " ")}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-[11px] tabular-nums">
                      <Clock3 className="size-3 shrink-0 opacity-60" aria-hidden />
                      Updated {new Date(detail.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Badge variant={runBadgeVariant} className="capitalize">
                    {statusLabel}
                  </Badge>
                  {detail.webUrl && onOpenUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => onOpenUrl(detail.webUrl)}
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      Open run
                    </Button>
                  ) : null}
                </div>
              </div>
            </header>

            <Card className="shrink-0 border-border/60 bg-white p-4 !shadow-none dark:bg-card/50">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Stages</h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {detail.jobs.length} {detail.jobs.length === 1 ? "job" : "jobs"}
                </span>
              </div>
              {detail.jobs.length ? (
                <div className="-mx-1 flex snap-x snap-mandatory items-stretch gap-1 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-gutter:stable]">
                  {detail.jobs.map((job, index) => {
                    const isActive = selectedJob?.id === job.id;
                    const jobBadgeVariant = resolveForgeWorkflowRunBadgeVariant(job.conclusion, job.status);
                    return (
                      <div key={job.id} className="flex items-stretch gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedJobId(job.id)}
                          aria-current={isActive ? "step" : undefined}
                          className={cn(
                            "flex w-[12.5rem] shrink-0 snap-start flex-col rounded-[6px] border px-3 py-2.5 text-left transition-all",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            isActive
                              ? "border-primary/45 bg-accent/45 ring-1 ring-primary/15"
                              : "border-border/60 bg-background/40 hover:border-primary/28 hover:bg-accent/20"
                          )}
                        >
                          <div className="mb-1.5 flex items-start gap-2">
                            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/50">
                              <StatusIcon status={job.conclusion ?? job.status} />
                            </span>
                            <span className="min-w-0 flex-1 leading-snug">
                              <span className="line-clamp-2 text-sm font-medium text-foreground">{job.name}</span>
                            </span>
                          </div>
                          <span className={cn(badgeVariants({ variant: jobBadgeVariant }), "mb-1.5 w-fit capitalize")}>
                            {(job.conclusion ?? job.status).replace(/_/g, " ")}
                          </span>
                          {renderTimingMuted(job.startedAt, job.completedAt, job.status)}
                        </button>
                        {index < detail.jobs.length - 1 ? (
                          <div className="flex shrink-0 items-center px-0.5 text-muted-foreground/45" aria-hidden>
                            <ChevronRight className="size-4" />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-[6px] border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
                  No stages found for this run.
                </p>
              )}
            </Card>

            {selectedJob ? (
              <Card className="shrink-0 border-border/60 bg-white p-4 !shadow-none dark:bg-card/50">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/45 pb-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/55">
                      <StatusIcon status={selectedJob.conclusion ?? selectedJob.status} />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-base font-semibold leading-tight tracking-tight text-foreground">{selectedJob.name}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={resolveForgeWorkflowRunBadgeVariant(selectedJob.conclusion, selectedJob.status)}
                          className="capitalize"
                        >
                          {(selectedJob.conclusion ?? selectedJob.status).replace(/_/g, " ")}
                        </Badge>
                      </div>
                      {renderTimingMuted(selectedJob.startedAt, selectedJob.completedAt, selectedJob.status)}
                    </div>
                  </div>
                  {selectedJob.webUrl && onOpenUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => onOpenUrl(selectedJob.webUrl!)}
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                      Job log
                    </Button>
                  ) : null}
                </div>

                <div className="pt-4">
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Steps</h4>
                    <span className="text-xs tabular-nums text-muted-foreground">{selectedJob.steps.length}</span>
                  </div>

                  {selectedJob.steps.length ? (
                    <ol className="space-y-0">
                      {selectedJob.steps.map((step, stepIndex) => {
                        const durationText = getStepDurationText(step.startedAt, step.completedAt, step.status);
                        const isLast = stepIndex === selectedJob.steps.length - 1;
                        return (
                          <li key={step.id} className="flex gap-3">
                            <div className="flex w-6 shrink-0 flex-col items-center pt-0.5">
                              <StepTimelineGlyph conclusion={step.conclusion} status={step.status} />
                              {!isLast ? <span className="mt-1 min-h-[1.25rem] w-px flex-1 bg-border/55" aria-hidden /> : null}
                            </div>
                            <div className={cn("min-w-0 flex-1 pb-5", isLast && "pb-0")}>
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-sm font-medium leading-snug text-foreground">{step.name}</p>
                                {durationText ? (
                                  <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{durationText}</span>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="rounded-[6px] border border-dashed border-border/60 px-3 py-5 text-center text-sm text-muted-foreground">
                      No steps recorded for this job.
                    </p>
                  )}
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepTimelineGlyph({ conclusion, status }: { conclusion: string | null; status: string }) {
  const st = status.toLowerCase();
  const co = (conclusion ?? "").toLowerCase();

  if (co === "success") {
    return (
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-background"
        aria-hidden
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }

  if (co === "failure" || co === "failed" || co === "cancelled" || co === "canceled" || co === "timed_out" || co === "action_required") {
    return (
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground ring-2 ring-background"
        aria-hidden
      >
        <X className="size-3" strokeWidth={2.5} />
      </span>
    );
  }

  if (co === "skipped" || co === "neutral") {
    return (
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-background"
        aria-hidden
      >
        <span className="select-none text-xs font-semibold leading-none">—</span>
      </span>
    );
  }

  if (
    st === "in_progress" ||
    st === "queued" ||
    st === "pending" ||
    st === "waiting" ||
    st === "running" ||
    st === "created" ||
    st === "preparing" ||
    st === "scheduled"
  ) {
    return (
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-background"
        aria-hidden
      >
        <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      className="size-5 shrink-0 rounded-full bg-muted-foreground/40 ring-2 ring-background"
      aria-hidden
    />
  );
}

function StatusIcon({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "success") {
    return <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />;
  }
  if (normalized === "failure" || normalized === "failed" || normalized === "cancelled" || normalized === "canceled" || normalized === "timed_out") {
    return <XCircle className="size-4 text-destructive" aria-hidden />;
  }
  if (
    normalized === "in_progress" ||
    normalized === "queued" ||
    normalized === "pending" ||
    normalized === "running" ||
    normalized === "created" ||
    normalized === "preparing" ||
    normalized === "scheduled"
  ) {
    return <LoaderCircle className="size-4 animate-spin text-amber-500" aria-hidden />;
  }
  return <Clock3 className="size-4 text-muted-foreground" aria-hidden />;
}
