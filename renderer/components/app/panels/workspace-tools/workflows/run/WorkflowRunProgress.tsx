import { BotAvatar } from "@/components/app/shared/BotAvatar";
import { Button } from "@/components/ui/button";
import { WorkflowRunStatusIcon } from "@/components/app/panels/workspace-tools/workflows/run/WorkflowRunStatusIcon";
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

export function WorkflowRunProgress({ stages, onOpenThread }: WorkflowRunProgressProps) {
  return (
    <section aria-labelledby="workflow-run-progress" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="workflow-run-progress" className="text-sm font-medium">Progress</h3>
        <span className="text-xs tabular-nums text-muted-foreground">
          {stages.filter((stage) => stage.status === "complete").length} of {stages.length} complete
        </span>
      </div>
      <ol className="-mx-2 space-y-0.5">
        {stages.map((stage, index) => (
          <li
            key={stage.id}
            className={cn(
              "relative flex items-start gap-3 rounded-md px-2 py-2",
              stage.status === "active" && "bg-primary/[0.06]",
              stage.status === "error" && "bg-destructive/[0.06]"
            )}
          >
            {index < stages.length - 1 ? (
              <span className="absolute left-[17px] top-8 h-[calc(100%-1.25rem)] w-px bg-border" aria-hidden="true" />
            ) : null}
            <span className="grid size-5 shrink-0 place-items-center">
              <WorkflowRunStatusIcon status={stage.status} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {stage.role?.botSnapshot ? <BotAvatar avatar={stage.role.botSnapshot.avatar} size={24} className="shrink-0" /> : null}
                  <p className={cn("truncate text-sm font-medium", stage.status === "pending" && "text-muted-foreground")}>{stage.title}</p>
                </div>
                {stage.status === "active" || stage.status === "paused" || stage.status === "error" ? (
                  <Badge variant={stage.status === "error" ? "destructive" : stage.status === "paused" ? "warning" : "default"}>
                    {STATUS_LABELS[stage.status]}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{stage.description}</p>
              {stage.role ? <p className="mt-1 text-[11px] text-muted-foreground/80">{stage.role.botSnapshot?.name ?? stage.role.toolId} · {stage.role.kind === "writer" ? "Work" : "Review"}</p> : null}
              {stage.role?.conversationId ? <Button variant="ghost" size="sm" className="h-auto px-0 py-1 text-xs"
                onClick={() => { if (stage.role?.conversationId) onOpenThread(stage.role.conversationId); }}
                aria-label={`Open ${stage.title} thread`}>Open thread</Button> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
