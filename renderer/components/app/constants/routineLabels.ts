import type { RoutineCalendarEntryStatus, RoutineIntervalUnit, RoutineMissedPolicy, RoutineRunPlace, RoutineRunStatus, RoutineScheduleKind } from "@shared/types/bots/routines.types";

export const ROUTINE_SCHEDULE_KIND_LABELS: Readonly<Record<RoutineScheduleKind, string>> = {
  hourly: "Every hour", daily: "Every day", weekdays: "Weekdays", weekly: "Every week", monthly: "Every month",
  interval: "Repeat every…", custom: "Custom (cron)", once: "Once"
};
export const ROUTINE_INTERVAL_UNIT_LABELS: Readonly<Record<RoutineIntervalUnit, string>> = { minutes: "minutes", hours: "hours", days: "days" };
export const ROUTINE_RUN_PLACE_LABELS: Readonly<Record<RoutineRunPlace, { label: string; short: string; description: string }>> = {
  chat: { label: "In the bot's chat", short: "Chat", description: "Posted to the chat like a message; the reply appears there." },
  thread: { label: "In its own thread", short: "Own thread", description: "Every run continues one thread named after the routine." }
};
export const ROUTINE_MISSED_POLICY_LABELS: Readonly<Record<RoutineMissedPolicy, string>> = {
  skip: "Skip runs missed while Nora was closed",
  "run-once": "Run once when Nora opens"
};
export const ROUTINE_RUN_STATUS_LABELS: Readonly<Record<RoutineRunStatus, string>> = {
  queued: "Starting", running: "Running", "needs-attention": "Waiting for you", succeeded: "Done", failed: "Failed", interrupted: "Stopped", cancelled: "Skipped"
};
/** The dot beside a calendar entry: planned runs are hollow, finished ones coloured by outcome. */
export const ROUTINE_CALENDAR_STATUS_STYLES: Readonly<Record<RoutineCalendarEntryStatus, { label: string; dot: string }>> = {
  scheduled: { label: "Scheduled", dot: "border border-muted-foreground/60 bg-transparent" },
  queued: { label: ROUTINE_RUN_STATUS_LABELS.queued, dot: "bg-sky-500" },
  running: { label: ROUTINE_RUN_STATUS_LABELS.running, dot: "bg-sky-500 animate-pulse" },
  "needs-attention": { label: ROUTINE_RUN_STATUS_LABELS["needs-attention"], dot: "bg-amber-500" },
  succeeded: { label: ROUTINE_RUN_STATUS_LABELS.succeeded, dot: "bg-emerald-500" },
  failed: { label: ROUTINE_RUN_STATUS_LABELS.failed, dot: "bg-destructive" },
  interrupted: { label: ROUTINE_RUN_STATUS_LABELS.interrupted, dot: "bg-muted-foreground" },
  cancelled: { label: ROUTINE_RUN_STATUS_LABELS.cancelled, dot: "bg-muted-foreground/50" }
};
