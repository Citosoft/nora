import { noraIntegrationClient } from "@/components/app/clients/noraIntegrationClient";
import { readStoredGithubToken, readStoredGitlabHost, readStoredGitlabToken } from "@/components/app/logic/appPersistence";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ForgeWorkflowRunDetail } from "@shared/appTypes";
import { CheckCircle2, ChevronRight, Clock3, LoaderCircle, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function ForgeWorkflowRunPanel({ projectId, runId }: { projectId: string; runId: number }) {
  const [detail, setDetail] = useState<ForgeWorkflowRunDetail | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const statusLabel = useMemo(() => (detail?.conclusion ?? detail?.status ?? "unknown").replace(/_/g, " "), [detail]);
  const selectedJob = useMemo(
    () => detail?.jobs.find((job) => job.id === selectedJobId) ?? detail?.jobs[0] ?? null,
    [detail?.jobs, selectedJobId]
  );

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    void noraIntegrationClient.getForgeWorkflowRunDetail(projectId, runId, {
      githubToken: readStoredGithubToken(),
      gitlabToken: readStoredGitlabToken(),
      gitlabHost: readStoredGitlabHost()
    }).then((next) => {
      if (!mounted) {
        return;
      }
      setDetail(next);
      setSelectedJobId(next.jobs[0]?.id ?? null);
    }).catch((error: unknown) => {
      if (!mounted) {
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "Unable to load workflow run details.");
    }).finally(() => {
      if (mounted) {
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [projectId, runId]);

  return (
    <div className="center-column-surface flex h-full min-h-0 flex-col px-4 py-3">
      {isLoading ? <div className="text-sm text-muted-foreground">Loading action run graph...</div> : null}
      {errorMessage ? <div className="text-sm text-destructive">{errorMessage}</div> : null}
      {detail ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">{detail.name}</h2>
            <Badge variant="outline" className="capitalize">{statusLabel}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {[detail.branch, detail.event, new Date(detail.updatedAt).toLocaleString()].filter(Boolean).join(" · ")}
          </div>

          <section className="rounded-md border border-border/60 p-3">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Stages</div>
            {detail.jobs.length ? (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {detail.jobs.map((job, index) => {
                  const isActive = selectedJob?.id === job.id;
                  return (
                    <div key={job.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className={cn(
                          "group min-w-48 rounded-md border px-3 py-2 text-left transition",
                          isActive
                            ? "border-primary/50 bg-accent/40"
                            : "border-border/60 hover:border-primary/35 hover:bg-accent/20"
                        )}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <StatusIcon status={job.conclusion ?? job.status} />
                          <span className="truncate text-sm font-semibold">{job.name}</span>
                        </div>
                        <div className="text-xs capitalize text-muted-foreground">{(job.conclusion ?? job.status).replace(/_/g, " ")}</div>
                      </button>
                      {index < detail.jobs.length - 1 ? (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No stages found for this run.</div>
            )}
          </section>

          {selectedJob ? (
            <section className="rounded-md border border-border/60 p-3">
              <div className="mb-1 flex items-center gap-2">
                <StatusIcon status={selectedJob.conclusion ?? selectedJob.status} />
                <div className="text-sm font-bold">{selectedJob.name}</div>
              </div>
              <div className="mb-3 text-xs capitalize text-muted-foreground">{(selectedJob.conclusion ?? selectedJob.status).replace(/_/g, " ")}</div>
              <ol className="ml-4 border-l border-border/50 pl-3">
                {selectedJob.steps.map((step) => (
                  <li key={step.id} className="relative pb-3">
                    <span
                      className={cn(
                        "absolute -left-[18px] top-1 block size-2 rounded-full",
                        step.conclusion === "success"
                          ? "bg-emerald-500"
                          : step.conclusion
                            ? "bg-destructive"
                            : "bg-amber-500"
                      )}
                    />
                    <div className="text-sm font-medium">{step.name}</div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "success") {
    return <CheckCircle2 className="size-4 text-emerald-500" />;
  }
  if (normalized === "failure" || normalized === "cancelled" || normalized === "timed_out") {
    return <XCircle className="size-4 text-destructive" />;
  }
  if (normalized === "in_progress" || normalized === "queued" || normalized === "pending") {
    return <LoaderCircle className="size-4 animate-spin text-amber-500" />;
  }
  return <Clock3 className="size-4 text-muted-foreground" />;
}
