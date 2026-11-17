import { z } from "zod";
import { BOT_NAME_MAX, botAvatarSchema, botIdSchema } from "@shared/bots/contracts";

export const ROUTINE_NAME_MAX = 80;
export const ROUTINE_INSTRUCTION_MAX = 4000;
export const ROUTINE_CRON_MAX = 120;
/** Routines a single bot may keep; enough for a busy bot without letting a runaway tool fill the store. */
export const ROUTINES_PER_BOT_MAX = 20;
/** Schedules may not run more often than this, so a mistyped interval cannot flood a bot with turns. */
export const ROUTINE_MINIMUM_INTERVAL_MINUTES = 3;
/** The largest missed-occurrence count a run names exactly; larger counts read as "more than this". */
export const ROUTINE_MISSED_COUNT_LIMIT = 999;

export const routineIdSchema = z.string().min(1).max(512);
const id = routineIdSchema;
const time = z.string().datetime();
/** A wall-clock time in the routine's timezone, "HH:MM" on a 24-hour clock. */
export const routineTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Times are HH:MM on a 24-hour clock");
/** A calendar date "YYYY-MM-DD" that exists. */
export const routineDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Choose a date that exists");
const weekday = z.number().int().min(0).max(6);

export const ROUTINE_INTERVAL_UNITS = ["minutes", "hours", "days"] as const;
/**
 * When a routine runs, as presets the editor offers plus a five-field cron expression for anything else.
 * Every kind except `interval` is read on the routine's own clock (`timezone`), so "daily at 09:00" follows daylight saving.
 */
export const routineScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hourly"), minute: z.number().int().min(0).max(59) }).strict(),
  z.object({ kind: z.literal("daily"), time: routineTimeSchema }).strict(),
  z.object({ kind: z.literal("weekdays"), time: routineTimeSchema }).strict(),
  z.object({ kind: z.literal("weekly"), weekday, time: routineTimeSchema }).strict(),
  z.object({ kind: z.literal("monthly"), day: z.number().int().min(1).max(31), time: routineTimeSchema }).strict(),
  /** Every `amount` units counted from `anchorAt`, independent of the wall clock. */
  z.object({ kind: z.literal("interval"), amount: z.number().int().min(1).max(100_000), unit: z.enum(ROUTINE_INTERVAL_UNITS), anchorAt: time }).strict(),
  z.object({ kind: z.literal("custom"), expression: z.string().trim().min(1).max(ROUTINE_CRON_MAX) }).strict(),
  /** One run; afterwards the routine pauses and resumes only with a future date. */
  z.object({ kind: z.literal("once"), date: routineDateSchema, time: routineTimeSchema }).strict()
]);

/** Where runs land: `chat` posts into the bot's direct chat; `thread` keeps the routine's own thread beside it. */
export const ROUTINE_RUN_PLACES = ["chat", "thread"] as const;
/** What happens to occurrences that came due while Nora was closed: `skip` records and drops them, `run-once` runs the newest on start. */
export const ROUTINE_MISSED_POLICIES = ["skip", "run-once"] as const;

export const routineSchema = z.object({
  id,
  botId: botIdSchema,
  name: z.string().trim().min(1).max(ROUTINE_NAME_MAX),
  /** What the bot is asked to do on each run. */
  instruction: z.string().trim().min(1).max(ROUTINE_INSTRUCTION_MAX),
  active: z.boolean(),
  /** IANA zone the schedule is read in. */
  timezone: z.string().min(1).max(64),
  schedule: routineScheduleSchema,
  /** The workspace runs work in; a workspace bot's routine always uses the bot's own workspace. */
  workspaceId: id,
  runIn: z.enum(ROUTINE_RUN_PLACES),
  missedPolicy: z.enum(ROUTINE_MISSED_POLICIES),
  /** Null while paused or after a one-time routine has run. */
  nextRunAt: time.nullable(),
  /** The routine's own thread, kept across runs when it runs in a thread. */
  threadId: id.nullable(),
  createdAt: time,
  updatedAt: time
}).strict();

export const ROUTINE_RUN_STATUSES = ["queued", "running", "needs-attention", "succeeded", "failed", "interrupted", "cancelled"] as const;
export const routineRunSchema = z.object({
  id,
  routineId: id,
  botId: botIdSchema,
  kind: z.enum(["scheduled", "manual"]),
  /** The occurrence this run stands for; the time it was started for a manual run. */
  scheduledFor: time,
  /** The routine's name and instruction when the run was made, so history reads correctly after edits. */
  routineName: z.string().min(1).max(ROUTINE_NAME_MAX),
  status: z.enum(ROUTINE_RUN_STATUSES),
  error: z.string().max(500).nullable(),
  /** Set on a cancelled run that records occurrences missed while Nora was closed; `until` is the last of them. */
  missed: z.object({ count: z.number().int().min(1), until: time.nullable() }).strict().nullable(),
  /** The thread the run's work happened in, once it started. */
  conversationId: id.nullable(),
  createdAt: time,
  updatedAt: time
}).strict();

/** What the editor sends; main owns ids, timestamps, next run and the routine's thread. */
export const routineInputSchema = routineSchema.pick({ botId: true, name: true, instruction: true, active: true, timezone: true,
  schedule: true, workspaceId: true, runIn: true, missedPolicy: true }).strict();

export const routineListSchema = z.object({ routines: z.array(routineSchema), runs: z.array(routineRunSchema) }).strict();

/** The longest range one calendar request may cover; a month grid shows at most six weeks. */
export const ROUTINE_CALENDAR_MAX_DAYS = 62;
/** Planned occurrences one routine contributes to a range; a 3-minute interval over six weeks would otherwise be tens of thousands. */
export const ROUTINE_CALENDAR_OCCURRENCES_MAX = 500;
export const routineCalendarRangeSchema = z.object({ from: time, to: time }).strict()
  .refine(({ from, to }) => Date.parse(to) > Date.parse(from) && Date.parse(to) - Date.parse(from) <= ROUTINE_CALENDAR_MAX_DAYS * 86_400_000,
    `Calendar ranges cover at most ${ROUTINE_CALENDAR_MAX_DAYS} days`);
/** A routine as the calendar shows it, with its bot's name and face resolved in main so a closed workspace's bot still reads correctly. */
export const routineCalendarRoutineSchema = z.object({
  routine: routineSchema,
  bot: z.object({ name: z.string().min(1).max(BOT_NAME_MAX), avatar: botAvatarSchema }).strict().nullable()
}).strict();
/** One entry on the calendar: a run from history, or `scheduled` for one the schedule will make. */
export const routineCalendarEntrySchema = z.object({
  id,
  routineId: id,
  at: time,
  status: z.union([z.enum(ROUTINE_RUN_STATUSES), z.literal("scheduled")]),
  /** Set for a history entry. */
  run: routineRunSchema.nullable(),
  /** Set when a planned occurrence list was cut at `ROUTINE_CALENDAR_OCCURRENCES_MAX`; the entry is the last one shown. */
  truncated: z.boolean()
}).strict();
export const routineCalendarSchema = z.object({
  from: time,
  to: time,
  routines: z.array(routineCalendarRoutineSchema),
  entries: z.array(routineCalendarEntrySchema)
}).strict();
