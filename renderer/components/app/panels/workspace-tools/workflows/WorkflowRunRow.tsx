import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { loopRunStageStatus } from "@/components/app/logic/loopRunPresentation";
import type { WorkflowRunRowProps } from "@/components/app/types/workflowSurface.types";
import { Button } from "@/components/ui/button";
import { WorkflowRunStatusBadge } from "./run/WorkflowRunStatusBadge";
import { WorkflowRunStatusIcon } from "./run/WorkflowRunStatusIcon";

function describe({ iterations, limits, startedAt }: WorkflowRunRowProps["run"]): string {
  const progress = `${iterations.length} of ${limits.maxIterations} iterations`;
  return startedAt ? `${progress} · started ${new Date(startedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}` : progress;
}

export function WorkflowRunRow({ run, needsInput, onOpen, onDelete }: WorkflowRunRowProps) {
  return <li className="flex items-center gap-3 px-4 py-3">
    <WorkflowRunStatusIcon status={loopRunStageStatus(run.status)} />
    <button type="button" className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onOpen}>
      <span className="block truncate text-sm font-medium">{run.definition.name}</span>
      <span className="block truncate text-xs text-muted-foreground">{describe(run)}</span>
    </button>
    {needsInput ? <Badge variant="warning">Needs input</Badge> : <WorkflowRunStatusBadge status={run.status} />}
    {onDelete && <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Delete ${run.definition.name} workflow run`} tooltip="Delete" onClick={onDelete}>
      <Trash2 className="size-3.5" aria-hidden="true" /></Button>}
  </li>;
}
