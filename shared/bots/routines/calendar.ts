import { ROUTINE_CALENDAR_OCCURRENCES_MAX } from "./contracts";
import { nextRoutineOccurrence } from "./schedule";
import type { Routine, RoutineCalendar, RoutineCalendarEntry, RoutineCalendarRange, RoutineCalendarRoutine, RoutineRun } from "@shared/types/bots/routines.types";

/** Occurrences the schedule will make in the range, from the routine's next due time on; paused routines plan nothing. */
function plannedEntries(routine: Routine, from: number, to: number): RoutineCalendarEntry[] {
  if (!routine.active || !routine.nextRunAt) return [];
  const due = Date.parse(routine.nextRunAt);
  // A due time before the range continues from the range's start rather than walking every occurrence in between.
  let at: Date | null = due >= from ? new Date(due) : nextRoutineOccurrence(routine.schedule, routine.timezone, new Date(from - 1));
  if (routine.schedule.kind === "once") at = due >= from ? new Date(due) : null;
  const entries: RoutineCalendarEntry[] = [];
  while (at && at.getTime() < to) {
    if (entries.length === ROUTINE_CALENDAR_OCCURRENCES_MAX) { entries[entries.length - 1] = { ...entries[entries.length - 1], truncated: true }; break; }
    const iso = at.toISOString();
    entries.push({ id: `${routine.id}@${iso}`, routineId: routine.id, at: iso, status: "scheduled", run: null, truncated: false });
    at = routine.schedule.kind === "once" ? null : nextRoutineOccurrence(routine.schedule, routine.timezone, at);
  }
  return entries;
}

/**
 * Every routine with its runs in a range: what already happened comes from run history (placed at the occurrence it stood for),
 * what will happen is planned from each schedule. Both use the same schedule code as the scheduler, so the calendar never
 * promises a run the scheduler would not make.
 */
export function buildRoutineCalendar(range: RoutineCalendarRange, routines: readonly RoutineCalendarRoutine[], runs: readonly RoutineRun[]): RoutineCalendar {
  const from = Date.parse(range.from), to = Date.parse(range.to);
  const history = runs.filter((run) => { const at = Date.parse(run.scheduledFor); return at >= from && at < to; })
    .map((run): RoutineCalendarEntry => ({ id: run.id, routineId: run.routineId, at: run.scheduledFor, status: run.status, run, truncated: false }));
  const planned = routines.flatMap(({ routine }) => plannedEntries(routine, from, to));
  const entries = [...history, ...planned].sort((left, right) => left.at.localeCompare(right.at) || left.id.localeCompare(right.id));
  return { from: range.from, to: range.to, routines: [...routines], entries };
}
