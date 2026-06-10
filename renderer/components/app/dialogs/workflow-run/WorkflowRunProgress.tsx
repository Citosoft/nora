import { WorkflowRunStatusIcon } from "@/components/app/dialogs/workflow-run/WorkflowRunStatusIcon";
import type { WorkflowRunProgressProps } from "@/components/app/types/loopRunPresentation.types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  pending: "Pending",
  active: "In progress",
  complete: "Complete",
  paused: "Paused",
  cancelled: "Cancelled",
  error: "Failed"
} as const;

export function WorkflowRunProgress({ stages }: WorkflowRunProgressProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Workflow progress</h3>
          <p className="mt-1 text-xs text-muted-foreground">Preparation, agents, and final outcome</p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {stages.filter((stage) => stage.status === "complete").length}/{stages.length} complete
        </span>
      </div>
      <div className="space-y-1">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className={cn(
              "relative flex items-start gap-3 rounded-md px-3 py-2.5",
              stage.status === "active" && "bg-primary/[0.06]",
              stage.status === "error" && "bg-destructive/[0.06]"
            )}
          >
            {index < stages.length - 1 ? (
              <span className="absolute left-[19px] top-8 h-[calc(100%-1.25rem)] w-px bg-border" aria-hidden="true" />
            ) : null}
            <span className="relative z-10 grid size-5 place-items-center bg-card">
              <WorkflowRunStatusIcon status={stage.status} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className={cn("truncate text-sm font-medium", stage.status === "pending" && "text-muted-foreground")}>{stage.title}</p>
                {stage.status === "active" || stage.status === "paused" || stage.status === "error" ? (
                  <Badge variant={stage.status === "error" ? "destructive" : stage.status === "paused" ? "warning" : "default"}>
                    {STATUS_LABELS[stage.status]}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{stage.description}</p>
              {stage.role ? <p className="mt-1 text-[11px] text-muted-foreground/80">{stage.role.toolId} · {stage.role.kind}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
