import { Pencil, Play, Trash2 } from "lucide-react";
import type { WorkflowDefinitionRowProps } from "@/components/app/types/workflowSurface.types";
import { Button } from "@/components/ui/button";
import { WorkflowAgentChips } from "./WorkflowAgentChips";

function describe({ stages, limits }: WorkflowDefinitionRowProps["definition"]): string {
  const team = `${stages.length} ${stages.length === 1 ? "stage" : "stages"}`;
  return `${team} · up to ${limits.maxIterations} ${limits.maxIterations === 1 ? "iteration" : "iterations"}`;
}

export function WorkflowDefinitionRow({ definition, agents, onEdit, onRun, onDelete }: WorkflowDefinitionRowProps) {
  return <li className="flex items-start gap-3 px-4 py-3">
    <div className="min-w-0 flex-1 space-y-2">
      <button type="button" className="block w-full min-w-0 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onEdit}>
        <span className="block truncate text-sm font-medium">{definition.name}</span>
        {definition.description ? <span className="block truncate text-xs text-foreground/80" title={definition.description}>{definition.description}</span> : null}
        <span className="block truncate text-xs text-muted-foreground">{describe(definition)}</span>
      </button>
      <WorkflowAgentChips agents={agents} />
    </div>
    <div className="flex shrink-0 items-center gap-3">
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={`Edit ${definition.name}`} tooltip="Edit" onClick={onEdit}>
        <Pencil className="size-3.5" aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Delete workflow ${definition.name}`} tooltip="Delete" onClick={onDelete}>
        <Trash2 className="size-3.5" aria-hidden="true" /></Button>
      <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={onRun}><Play className="size-3.5" aria-hidden="true" />Run</Button>
    </div>
  </li>;
}
