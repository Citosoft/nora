import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutineEditorStepRailProps } from "@/components/app/types/botRoutines.types";

/** The editor's steps down the left side, each with what it holds so far; a step opens once the steps before it are complete. */
export function RoutineEditorStepRail({ steps, current, reachable, onSelect }: RoutineEditorStepRailProps) {
  return <nav aria-label="Routine steps" className="w-48 shrink-0 border-r bg-muted/30 p-3">
    <ol className="space-y-1">
      {steps.map((step, index) => {
        const active = step.id === current;
        const done = step.complete && !active && steps.findIndex((entry) => entry.id === current) > index;
        return <li key={step.id}>
          <button type="button" aria-current={active ? "step" : undefined} disabled={!reachable(step.id)} onClick={() => onSelect(step.id)}
            className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              active ? "bg-background shadow-sm" : "hover:bg-background/60")}>
            <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
              active ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary text-primary" : "text-muted-foreground")}>
              {done ? <Check className="size-3" aria-hidden="true" /> : index + 1}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{step.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{step.summary}</span>
            </span>
          </button>
        </li>;
      })}
    </ol>
  </nav>;
}
