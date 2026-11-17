import { formatRoutineInstant } from "@shared/bots/routines/describe";
import { ROUTINE_RUN_STATUS_LABELS } from "@/components/app/constants/routineLabels";
import type { RoutineRun } from "@shared/types/bots/routines.types";
import type { RoutineRunListProps } from "@/components/app/types/botRoutines.types";

const RUNS_SHOWN = 8;

function detail(run: RoutineRun): string | null {
  if (run.missed) return run.missed.count > 1 ? `${run.missed.count} runs missed while Nora was closed` : "Missed while Nora was closed";
  return run.error;
}

/** Recent runs across the bot's routines, newest first; a run that started work links to its thread. */
export function RoutineRunList({ runs, timezoneFor, openerFor }: RoutineRunListProps) {
  return <ul className="space-y-1">
    {runs.slice(0, RUNS_SHOWN).map((run) => {
      const note = detail(run);
      const text = <>
        <span className="block truncate">{run.routineName} · {ROUTINE_RUN_STATUS_LABELS[run.status]}{run.kind === "manual" ? " (run now)" : ""}</span>
        <span className="block text-muted-foreground">{formatRoutineInstant(run.scheduledFor, timezoneFor(run.routineId))}{note ? ` · ${note}` : ""}</span>
      </>;
      const open = run.conversationId ? openerFor(run.conversationId) : null;
      return <li key={run.id} className="text-xs">
        {open ? <button type="button" className="w-full rounded px-1 py-0.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={open}>{text}</button> : <div className="px-1 py-0.5">{text}</div>}
      </li>;
    })}
  </ul>;
}
