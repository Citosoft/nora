import { formatRoutineInstant } from "@shared/bots/routines/describe";
import type { Routine, RoutineRun } from "@shared/types/bots/routines.types";

/**
 * The instruction a routine run sends. It says the turn came from a schedule rather than a person, when it was due on the
 * routine's own clock (so "today" and "last week" resolve correctly near midnight), and that nobody may be watching.
 */
export function routinePrompt(routine: Pick<Routine, "name" | "instruction" | "timezone">, run: Pick<RoutineRun, "kind" | "scheduledFor">): string {
  const when = formatRoutineInstant(run.scheduledFor, routine.timezone);
  const origin = run.kind === "scheduled" ? `your routine "${routine.name}", scheduled for ${when}` : `your routine "${routine.name}", started by hand at ${when}`;
  return [`This turn is ${origin}. The user may not be watching: do the task, then finish with a short report of the outcome.`
    + " Ask the user only when you cannot continue without them.", "", routine.instruction].join("\n");
}
