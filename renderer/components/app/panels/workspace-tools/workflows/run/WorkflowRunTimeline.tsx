import { WorkflowRunStatusIcon } from "@/components/app/panels/workspace-tools/workflows/run/WorkflowRunStatusIcon";
import { loopRunEventStatus } from "@/components/app/logic/loopRunPresentation";
import type { WorkflowRunTimelineProps } from "@/components/app/types/loopRunPresentation.types";

export function WorkflowRunTimeline({ events, runStatus }: WorkflowRunTimelineProps) {
  const latestEventId = events.at(-1)?.id;
  return (
    <section aria-labelledby="workflow-run-activity" className="space-y-3">
      <h3 id="workflow-run-activity" className="text-sm font-medium">Activity</h3>
      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {[...events].reverse().map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <WorkflowRunStatusIcon status={loopRunEventStatus(entry.kind, entry.id === latestEventId, runStatus)} className="mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm leading-5">{entry.message}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(entry.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </div>
        ))}
        {events.length === 0 ? <p className="text-sm text-muted-foreground">Activity appears as the workflow advances.</p> : null}
      </div>
    </section>
  );
}
