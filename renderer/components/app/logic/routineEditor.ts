import { localTimezone } from "@shared/bots/routines/schedule";
import type { Routine, RoutineInput, RoutineSchedule, RoutineTemplate } from "@shared/types/bots/routines.types";
import type { RoutineDraft } from "@/components/app/types/botRoutines.types";

const pad = (value: number): string => String(value).padStart(2, "0");

/** Tomorrow's date as "YYYY-MM-DD" on the local clock, the default for a one-time routine. */
function tomorrow(now: Date): string {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

/** A weekday-morning routine in the machine's timezone, posted to the bot's chat. */
export function newRoutineDraft(workspaceId: string, now: Date): RoutineDraft {
  return { name: "", instruction: "", active: true, timezone: localTimezone(), workspaceId, runIn: "chat", missedPolicy: "skip",
    kind: "weekdays", time: "09:00", minute: 0, weekday: 1, day: 1, amount: 1, unit: "hours", anchorAt: null, expression: "0 9 * * 1-5", date: tomorrow(now) };
}

/** The draft fields a schedule sets; the other fields keep what the user typed. */
function scheduleFields(schedule: RoutineSchedule): Partial<RoutineDraft> {
  switch (schedule.kind) {
    case "hourly": return { kind: schedule.kind, minute: schedule.minute };
    case "daily": case "weekdays": return { kind: schedule.kind, time: schedule.time };
    case "weekly": return { kind: schedule.kind, weekday: schedule.weekday, time: schedule.time };
    case "monthly": return { kind: schedule.kind, day: schedule.day, time: schedule.time };
    case "interval": return { kind: schedule.kind, amount: schedule.amount, unit: schedule.unit, anchorAt: schedule.anchorAt };
    case "custom": return { kind: schedule.kind, expression: schedule.expression };
    case "once": return { kind: schedule.kind, date: schedule.date, time: schedule.time };
  }
}

export function routineDraft(routine: Routine, now: Date): RoutineDraft {
  return { ...newRoutineDraft(routine.workspaceId, now), name: routine.name, instruction: routine.instruction, active: routine.active,
    timezone: routine.timezone, runIn: routine.runIn, missedPolicy: routine.missedPolicy, ...scheduleFields(routine.schedule) };
}

/** Fills the draft from a template, keeping the workspace and timezone; a one-off keeps the draft's date, as a template's date is a placeholder. */
export function applyRoutineTemplate(draft: RoutineDraft, template: RoutineTemplate): RoutineDraft {
  const schedule = scheduleFields(template.schedule);
  return { ...draft, name: template.name, instruction: template.instruction, runIn: template.runIn, ...schedule,
    ...(template.schedule.kind === "once" ? { date: draft.date } : {}) };
}

function scheduleFromDraft(draft: RoutineDraft, now: Date): RoutineSchedule {
  switch (draft.kind) {
    case "hourly": return { kind: "hourly", minute: draft.minute };
    case "daily": return { kind: "daily", time: draft.time };
    case "weekdays": return { kind: "weekdays", time: draft.time };
    case "weekly": return { kind: "weekly", weekday: draft.weekday, time: draft.time };
    case "monthly": return { kind: "monthly", day: draft.day, time: draft.time };
    // A new interval counts from now; an edited one keeps its anchor so the rhythm does not shift.
    case "interval": return { kind: "interval", amount: draft.amount, unit: draft.unit, anchorAt: draft.anchorAt ?? now.toISOString() };
    case "custom": return { kind: "custom", expression: draft.expression.trim() };
    case "once": return { kind: "once", date: draft.date, time: draft.time };
  }
}

/** What the editor saves; one-time routines default to running when Nora reopens, as a missed one-off has no later occurrence. */
export function routineInputFromDraft(draft: RoutineDraft, botId: string, now: Date): RoutineInput {
  return { botId, name: draft.name.trim(), instruction: draft.instruction.trim(), active: draft.active, timezone: draft.timezone,
    schedule: scheduleFromDraft(draft, now), workspaceId: draft.workspaceId, runIn: draft.runIn,
    missedPolicy: draft.kind === "once" ? "run-once" : draft.missedPolicy };
}
