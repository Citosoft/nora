import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import { WorkflowRunOutput } from "@/components/app/dialogs/workflow-run/WorkflowRunOutput";
import { WorkflowRunProgress } from "@/components/app/dialogs/workflow-run/WorkflowRunProgress";
import { WorkflowRunStatusIcon } from "@/components/app/dialogs/workflow-run/WorkflowRunStatusIcon";
import { WorkflowRunTimeline } from "@/components/app/dialogs/workflow-run/WorkflowRunTimeline";
import { buildLoopRunOutput, buildLoopRunStages, loopRunStatusCopy } from "@/components/app/logic/loopRunPresentation";
import type { LoopRunMonitorDialogProps } from "@/components/app/types/loopDesigner.types";
import type { LoopRunAction, LoopRunStageStatus } from "@/components/app/types/loopRunPresentation.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Clock3, GitPullRequest, LoaderCircle, Pause, Play, Repeat2, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LoopOutputEvent } from "@shared/appTypes";

function runStatusIcon(status: NonNullable<LoopRunMonitorDialogProps["run"]>["status"]): LoopRunStageStatus {
  switch (status) {
    case "preparing":
    case "running":
    case "pausing":
      return "active";
    case "paused":
      return "paused";
    case "completed":
      return "complete";
    case "cancelled":
      return "cancelled";
  }
}

export function LoopRunMonitorDialog({ open, run, onOpenChange, onRunChanged, onCreateChangeRequest }: LoopRunMonitorDialogProps) {
  const [liveLog, setLiveLog] = useState("");
  const [liveOutputEvents, setLiveOutputEvents] = useState<LoopOutputEvent[]>([]);
  const [pendingAction, setPendingAction] = useState<LoopRunAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isOpeningChangeRequest, setIsOpeningChangeRequest] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);
  const currentRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentRunIdRef.current === run?.id) return;
    currentRunIdRef.current = run?.id ?? null;
    setLiveLog(run?.outputLog ?? "");
    setLiveOutputEvents(run?.outputEvents ?? []);
  }, [run?.id, run?.outputEvents, run?.outputLog]);

  useEffect(() => {
    if (!run?.outputLog) return;
    setLiveLog((current) => run.outputLog.length > current.length ? run.outputLog : current);
  }, [run?.outputLog]);

  useEffect(() => {
    if (!run?.outputEvents) return;
    setLiveOutputEvents((current) => run.outputEvents.length > current.length ? run.outputEvents : current);
  }, [run?.outputEvents]);

  useEffect(() => {
    if (!open || !run) return;
    return noraLoopClient.onLoopRunOutput((payload) => {
      if (payload.projectId !== run.projectId || payload.runId !== run.id) return;
      setLiveOutputEvents((current) => {
        const knownIds = new Set(current.map((event) => event.id));
        return [...current, ...payload.events.filter((event) => !knownIds.has(event.id))].slice(-2_000);
      });
    });
  }, [open, run?.id, run?.projectId]);

  useEffect(() => {
    const element = logRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [liveLog, liveOutputEvents]);

  const stages = useMemo(() => run ? buildLoopRunStages(run) : [], [run]);
  const outputSegments = useMemo(
    () => buildLoopRunOutput({ events: liveOutputEvents, legacyOutput: liveLog }),
    [liveLog, liveOutputEvents]
  );

  if (!run) return null;

  const statusCopy = loopRunStatusCopy(run);
  const isActive = run.status === "preparing" || run.status === "running" || run.status === "pausing";

  async function act(action: LoopRunAction): Promise<void> {
    if (!run) return;
    setPendingAction(action);
    setActionError(null);
    try {
      const next = action === "pause"
        ? await noraLoopClient.pauseLoopRun(run.projectId, run.id)
        : action === "resume"
          ? await noraLoopClient.resumeLoopRun(run.projectId, run.id)
          : await noraLoopClient.cancelLoopRun(run.projectId, run.id);
      onRunChanged(next);
      setLiveLog(next.outputLog);
      setLiveOutputEvents(next.outputEvents);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Unable to ${action} workflow.`);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(88vh,900px)] w-[min(1120px,calc(100vw-2rem))] max-w-none"
        headerTitle={run.definition.name}
        onClose={() => onOpenChange(false)}
      >
        <DialogBody className="flex min-h-0 flex-col gap-5">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/[0.04] p-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10">
                <WorkflowRunStatusIcon status={runStatusIcon(run.status)} className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight">{statusCopy.title}</h2>
                  <Badge variant={run.status === "completed" ? "success" : run.status === "paused" ? "warning" : run.status === "cancelled" ? "secondary" : "default"}>
                    {run.status === "pausing" ? "Pausing" : run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{statusCopy.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Repeat2 className="size-4" aria-hidden="true" />
                <span><strong className="font-semibold text-foreground">{run.iterations.length}</strong> / {run.limits.maxIterations} iterations</span>
              </span>
              <span className="hidden items-center gap-2 text-muted-foreground sm:flex">
                <Clock3 className="size-4" aria-hidden="true" />
                {run.startedAt ? new Date(run.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not started"}
              </span>
            </div>
          </section>

          <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
              <WorkflowRunProgress stages={stages} />
              <WorkflowRunTimeline events={run.events} runStatus={run.status} />
            </div>
            <WorkflowRunOutput segments={outputSegments} isActive={isActive} scrollRef={logRef} />
          </div>

          {actionError ? <p className="text-sm text-destructive" role="alert">{actionError}</p> : null}
        </DialogBody>
        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-3">
            <p className="hidden text-xs text-muted-foreground sm:block">
              {run.worktreePath ? "Changes remain isolated in the workflow worktree." : "The managed worktree is being prepared."}
            </p>
            <div className="ml-auto flex items-center gap-2">
              {run.status === "running" || run.status === "pausing" ? (
                <Button variant="outline" disabled={pendingAction !== null || run.status === "pausing"} onClick={() => void act("pause")}>
                  {pendingAction === "pause" ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Pause className="mr-2 size-4" />}
                  {run.status === "pausing" ? "Pausing…" : "Pause"}
                </Button>
              ) : null}
              {run.status === "paused" ? (
                <Button disabled={pendingAction !== null} onClick={() => void act("resume")}>
                  {pendingAction === "resume" ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
                  Resume
                </Button>
              ) : null}
              {run.status !== "completed" && run.status !== "cancelled" ? (
                <Button className="border-rose-500/50 text-rose-600" variant="outline" disabled={pendingAction !== null} onClick={() => void act("cancel")}>
                  {pendingAction === "cancel" ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Square className="mr-2 size-4" />}
                  Cancel
                </Button>
              ) : null}
              {run.status === "completed" ? (
                <Button
                  disabled={isOpeningChangeRequest || !run.worktreeId}
                  onClick={() => {
                    setIsOpeningChangeRequest(true);
                    setActionError(null);
                    void onCreateChangeRequest(run).then(() => {
                      onOpenChange(false);
                    }).catch((error: unknown) => {
                      setActionError(error instanceof Error ? error.message : "Unable to open the pull or merge request dialog.");
                    }).finally(() => {
                      setIsOpeningChangeRequest(false);
                    });
                  }}
                >
                  {isOpeningChangeRequest ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <GitPullRequest className="mr-2 size-4" />}
                  Create PR / MR
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
