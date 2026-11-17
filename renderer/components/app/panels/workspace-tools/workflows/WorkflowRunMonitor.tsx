import { WorkflowRequests } from "./run/WorkflowRequests";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import type { WorkflowRunMonitorProps } from "@/components/app/types/workflowSurface.types";
import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import { WorkflowRunOutput } from "@/components/app/panels/workspace-tools/workflows/run/WorkflowRunOutput";
import { WorkflowRunProgress } from "@/components/app/panels/workspace-tools/workflows/run/WorkflowRunProgress";
import { WorkflowRunStatusIcon } from "@/components/app/panels/workspace-tools/workflows/run/WorkflowRunStatusIcon";
import { WorkflowRunTimeline } from "@/components/app/panels/workspace-tools/workflows/run/WorkflowRunTimeline";
import { buildLoopRunOutput, buildLoopRunStages, isLoopRunActive, loopRunStageStatus, loopRunStatusCopy } from "@/components/app/logic/loopRunPresentation";
import type { LoopRunAction } from "@/components/app/types/loopRunPresentation.types";
import { Button } from "@/components/ui/button";
import { WorkflowRunStatusBadge } from "./run/WorkflowRunStatusBadge";
import { WorkflowSurface } from "./WorkflowSurface";
import { GitPullRequest, LoaderCircle, Pause, Play, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LoopOutputEvent } from "@shared/appTypes";

export function WorkflowRunMonitor({ run, onBack, onRunChanged, onCreateChangeRequest }: WorkflowRunMonitorProps) {
  const { store } = useNativeRuntimePorts();
  const [liveLog, setLiveLog] = useState("");
  const [liveOutputEvents, setLiveOutputEvents] = useState<LoopOutputEvent[]>([]);
  const [pendingAction, setPendingAction] = useState<LoopRunAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isOpeningChangeRequest, setIsOpeningChangeRequest] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);
  const currentRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentRunIdRef.current === run.id) return;
    currentRunIdRef.current = run.id;
    setLiveLog(run.outputLog);
    setLiveOutputEvents(run.outputEvents);
  }, [run.id, run.outputEvents, run.outputLog]);

  useEffect(() => {
    if (!run.outputLog) return;
    setLiveLog((current) => run.outputLog.length > current.length ? run.outputLog : current);
  }, [run.outputLog]);

  useEffect(() => {
    if (!run.outputEvents) return;
    setLiveOutputEvents((current) => run.outputEvents.length > current.length ? run.outputEvents : current);
  }, [run.outputEvents]);

  useEffect(() => {
    return noraLoopClient.onLoopRunOutput((payload) => {
      if (payload.projectId !== run.projectId || payload.runId !== run.id) return;
      setLiveOutputEvents((current) => {
        const knownIds = new Set(current.map((event) => event.id));
        return [...current, ...payload.events.filter((event) => !knownIds.has(event.id))].slice(-2_000);
      });
    });
  }, [run.id, run.projectId]);

  useEffect(() => {
    const element = logRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [liveLog, liveOutputEvents]);

  const stages = useMemo(() => buildLoopRunStages(run), [run]);
  const outputSegments = useMemo(
    () => buildLoopRunOutput({ events: liveOutputEvents, legacyOutput: liveLog }),
    [liveLog, liveOutputEvents]
  );

  const statusCopy = loopRunStatusCopy(run);
  const isActive = isLoopRunActive(run.status);

  async function act(action: LoopRunAction): Promise<void> {
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

  const startedAt = run.startedAt ? new Date(run.startedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : null;
  const isBusy = pendingAction !== null;

  function createChangeRequest(): void {
    setIsOpeningChangeRequest(true);
    setActionError(null);
    void onCreateChangeRequest(run).then(onBack).catch((error: unknown) => {
      setActionError(error instanceof Error ? error.message : "Unable to open the pull or merge request dialog.");
    }).finally(() => setIsOpeningChangeRequest(false));
  }

  return (
    <WorkflowSurface
      title={run.definition.name}
      onBack={onBack}
      width="wide"
      footer={<>
        <p className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
          {run.worktreePath ? "Changes stay isolated in the workflow's worktree." : "The managed worktree is being prepared."}
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {run.status === "running" || run.status === "pausing" ? (
            <Button variant="outline" disabled={isBusy || run.status === "pausing"} onClick={() => void act("pause")}>
              {pendingAction === "pause" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
              {run.status === "pausing" ? "Pausing…" : "Pause"}
            </Button>
          ) : null}
          {run.status === "paused" ? (
            <Button disabled={isBusy} onClick={() => void act("resume")}>
              {pendingAction === "resume" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              Resume
            </Button>
          ) : null}
          {run.status !== "completed" && run.status !== "cancelled" ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={isBusy} onClick={() => void act("cancel")}>
              {pendingAction === "cancel" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Square className="size-4" aria-hidden="true" />}
              Cancel run
            </Button>
          ) : null}
          {run.status === "completed" ? (
            <Button disabled={isOpeningChangeRequest || !run.worktreeId} onClick={createChangeRequest}>
              {isOpeningChangeRequest ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <GitPullRequest className="size-4" aria-hidden="true" />}
              Create PR / MR
            </Button>
          ) : null}
        </div>
      </>}
    >
      <header className="flex items-start gap-3">
        <WorkflowRunStatusIcon status={loopRunStageStatus(run.status)} className="mt-1.5 size-5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{statusCopy.title}</h2>
            <WorkflowRunStatusBadge status={run.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{statusCopy.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {[`${run.iterations.length} of ${run.limits.maxIterations} iterations`, startedAt ? `Started ${startedAt}` : "Not started"].join(" · ")}
          </p>
        </div>
      </header>

      {actionError ? <p className="text-sm text-destructive" role="alert">{actionError}</p> : null}

      <WorkflowRequests run={run} />
      <div className="grid items-start gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-8">
          <WorkflowRunProgress stages={stages} onOpenThread={(id) => { store.openThread(id); }} />
          <WorkflowRunTimeline events={run.events} runStatus={run.status} />
        </div>
        <WorkflowRunOutput segments={outputSegments} isActive={isActive} scrollRef={logRef} />
      </div>
    </WorkflowSurface>
  );
}
