import { Pause, Pencil, Play, Trash2, Zap } from "lucide-react";
import { describeRoutineSchedule, formatRoutineInstant } from "@shared/bots/routines/describe";
import { Button } from "@/components/ui/button";
import { ROUTINE_RUN_STATUS_LABELS } from "@/components/app/constants/routineLabels";
import type { RoutineRowProps } from "@/components/app/types/botRoutines.types";

/** One routine: its schedule, where it works, when it runs next and how the last run went, with its controls. */
export function RoutineRow({ routine, lastRun, workspaceName, disabled, onEdit, onToggle, onRunNow, onRemove }: RoutineRowProps) {
  const next = routine.active && routine.nextRunAt ? `Next ${formatRoutineInstant(routine.nextRunAt, routine.timezone)}` : "Paused";
  return <li className="space-y-1.5 px-3 py-2.5">
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{routine.name}</p>
        <p className="text-xs text-muted-foreground">{describeRoutineSchedule(routine.schedule)} · {workspaceName}</p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button type="button" variant="ghost" size="icon" className="size-7" disabled={disabled} aria-label={`Run ${routine.name} now`} title="Run now" onClick={onRunNow}>
          <Zap className="size-3.5" aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon" className="size-7" disabled={disabled} aria-label={`${routine.active ? "Pause" : "Resume"} ${routine.name}`}
          title={routine.active ? "Pause" : "Resume"} onClick={onToggle}>
          {routine.active ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}</Button>
        <Button type="button" variant="ghost" size="icon" className="size-7" disabled={disabled} aria-label={`Edit ${routine.name}`} title="Edit" onClick={onEdit}>
          <Pencil className="size-3.5" aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" disabled={disabled}
          aria-label={`Delete ${routine.name}`} title="Delete" onClick={onRemove}><Trash2 className="size-3.5" aria-hidden="true" /></Button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">{next}{lastRun ? ` · Last run: ${ROUTINE_RUN_STATUS_LABELS[lastRun.status]}` : ""}</p>
  </li>;
}
