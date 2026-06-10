import { WorkflowRunStatusIcon } from "@/components/app/dialogs/workflow-run/WorkflowRunStatusIcon";
import { loopRunEventStatus } from "@/components/app/logic/loopRunPresentation";
import type { WorkflowRunTimelineProps } from "@/components/app/types/loopRunPresentation.types";

export function WorkflowRunTimeline({ events, runStatus }: WorkflowRunTimelineProps) {
  const latestEventId = events.at(-1)?.id;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Recent activity</h3>
      <div className="mt-3 max-h-56 space-y-3 overflow-y-auto pr-1">
        {[...events].reverse().map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <WorkflowRunStatusIcon status={loopRunEventStatus(entry.kind, entry.id === latestEventId, runStatus)} className="mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm leading-5">{entry.message}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
        {events.length === 0 ? <p className="text-sm text-muted-foreground">Activity will appear as the workflow advances.</p> : null}
      </div>
    </section>
  );
}
