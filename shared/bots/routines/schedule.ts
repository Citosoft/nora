import { ROUTINE_MINIMUM_INTERVAL_MINUTES, ROUTINE_MISSED_COUNT_LIMIT, routineScheduleSchema } from "./contracts";
import type { MissedOccurrences, RoutineIntervalUnit, RoutineSchedule } from "@shared/types/bots/routines.types";

/**
 * Pure schedule arithmetic for bot routines. Every wall-clock schedule compiles to a cron-like spec searched day by day in the
 * routine's timezone, so presets and custom expressions share one implementation, including daylight-saving gaps and repeats.
 */

const MINIMUM_INTERVAL_MS = ROUTINE_MINIMUM_INTERVAL_MINUTES * 60_000;
const MAX_SEARCH_DAYS = 366 * 5;
/** The longest clock change of any timezone is shorter than this. */
const MAX_GAP_MINUTES = 3 * 60;
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const CRON_DECIMAL = /^[0-9]+$/;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

interface CalendarParts { year: number; month: number; day: number; weekday: number; hour: number; minute: number; }
interface CronField { values: number[]; wildcard: boolean; }
interface CronSpec { minute: CronField; hour: CronField; day: CronField; month: CronField; weekday: CronField; }

/** A schedule the user can correct; other errors are faults. */
export class RoutineScheduleError extends Error {}

/** The machine's IANA timezone, used for new routines. */
export function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function isValidTimezone(timezone: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); return true; } catch { return false; }
}

/** Throws a `RoutineScheduleError` when a schedule cannot be saved: bad shape, unknown zone, bad cron or runs closer than the minimum. */
export function validateRoutineSchedule(schedule: RoutineSchedule, timezone: string): void {
  if (!routineScheduleSchema.safeParse(schedule).success) throw new RoutineScheduleError("This schedule is not valid.");
  if (!isValidTimezone(timezone)) throw new RoutineScheduleError(`Nora does not know the timezone "${timezone}".`);
  if (schedule.kind === "interval") {
    if (intervalMilliseconds(schedule.amount, schedule.unit) < MINIMUM_INTERVAL_MS) {
      throw new RoutineScheduleError(`Routines can run at most every ${ROUTINE_MINIMUM_INTERVAL_MINUTES} minutes.`);
    }
    return;
  }
  if (schedule.kind !== "custom") return;
  validateCronSyntax(schedule.expression);
  const spec = parseCron(schedule.expression);
  let previous = nextCronOccurrence(spec, timezone, new Date("2026-01-01T00:00:00.000Z"));
  for (let index = 0; index < 200; index += 1) {
    const next = nextCronOccurrence(spec, timezone, previous);
    if (next.getTime() - previous.getTime() < MINIMUM_INTERVAL_MS) {
      throw new RoutineScheduleError(`This expression runs more often than every ${ROUTINE_MINIMUM_INTERVAL_MINUTES} minutes.`);
    }
    previous = next;
  }
}

/** The first occurrence strictly after `after`; null for a one-time schedule whose time has passed. */
export function nextRoutineOccurrence(schedule: RoutineSchedule, timezone: string, after: Date): Date | null {
  switch (schedule.kind) {
    case "once": {
      const due = routineOnceInstant(schedule, timezone);
      return after.getTime() < due.getTime() ? due : null;
    }
    case "interval": {
      const duration = intervalMilliseconds(schedule.amount, schedule.unit);
      const anchor = Date.parse(schedule.anchorAt);
      if (after.getTime() < anchor) return new Date(anchor);
      return new Date(anchor + (Math.floor((after.getTime() - anchor) / duration) + 1) * duration);
    }
    default: return nextCronOccurrence(scheduleCronSpec(schedule), timezone, after);
  }
}

/**
 * Walks from the first missed occurrence up to `now`, counting at most `ROUTINE_MISSED_COUNT_LIMIT` before jumping ahead.
 * Missed occurrences are summarised, never replayed: a laptop closed for a week must not wake into a week of runs.
 */
export function missedOccurrences(schedule: RoutineSchedule, timezone: string, first: Date, now: Date): MissedOccurrences {
  let count = 1;
  let previous: Date | null = null;
  let last = first;
  let next = nextRoutineOccurrence(schedule, timezone, last);
  while (next && next.getTime() <= now.getTime()) {
    if (count >= ROUTINE_MISSED_COUNT_LIMIT) {
      const resumed = nextRoutineOccurrence(schedule, timezone, now);
      return { count, truncated: true, last: next, previous: last, next: resumed ?? next };
    }
    previous = last; last = next; count += 1;
    next = nextRoutineOccurrence(schedule, timezone, last);
  }
  return { count, truncated: false, last, previous, next: next ?? last };
}

/** The instant of a one-time schedule; a repeated local time runs at its first instant and a skipped one just after the gap. */
export function routineOnceInstant(schedule: Extract<RoutineSchedule, { kind: "once" }>, timezone: string): Date {
  const [year, month, day] = schedule.date.split("-").map(Number);
  const [hour, minute] = parseTime(schedule.time);
  const start = Date.UTC(year, month - 1, day, hour, minute);
  for (let step = 0; step <= MAX_GAP_MINUTES; step += 1) {
    const local = new Date(start + step * 60_000);
    const [candidate] = zonedDateTimeCandidates({ year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate(),
      weekday: local.getUTCDay(), hour: local.getUTCHours(), minute: local.getUTCMinutes() }, timezone);
    if (candidate) return candidate;
  }
  throw new RoutineScheduleError("This date and time never happen in the routine's timezone.");
}

function scheduleCronSpec(schedule: Exclude<RoutineSchedule, { kind: "interval" | "once" }>): CronSpec {
  const anyDay = wildcardField(1, 31), anyMonth = wildcardField(1, 12), anyWeekday = wildcardField(0, 6);
  if (schedule.kind === "hourly") return { minute: field([schedule.minute]), hour: wildcardField(0, 23), day: anyDay, month: anyMonth, weekday: anyWeekday };
  if (schedule.kind === "custom") return parseCron(schedule.expression);
  const [hour, minute] = parseTime(schedule.time);
  const at = { minute: field([minute]), hour: field([hour]), month: anyMonth };
  switch (schedule.kind) {
    case "daily": return { ...at, day: anyDay, weekday: anyWeekday };
    case "weekdays": return { ...at, day: anyDay, weekday: field([1, 2, 3, 4, 5]) };
    case "weekly": return { ...at, day: anyDay, weekday: field([schedule.weekday]) };
    case "monthly": return { ...at, day: field([schedule.day]), weekday: anyWeekday };
  }
}

function nextCronOccurrence(spec: CronSpec, timezone: string, after: Date): Date {
  const start = zonedParts(after, timezone);
  const calendar = Date.UTC(start.year, start.month - 1, start.day);
  const repeatedStart = zonedDateTimeCandidates(start, timezone).length > 1;
  for (let offset = 0; offset <= MAX_SEARCH_DAYS; offset += 1) {
    const current = new Date(calendar + offset * 86_400_000);
    const year = current.getUTCFullYear(), month = current.getUTCMonth() + 1, day = current.getUTCDate(), weekday = current.getUTCDay();
    if (!spec.month.values.includes(month) || !calendarMatches(spec, day, weekday)) continue;
    let repeatedCandidate: Date | undefined;
    for (const hour of spec.hour.values) {
      for (const minute of spec.minute.values) {
        if (offset === 0 && !repeatedStart && (hour < start.hour || (hour === start.hour && minute < start.minute))) continue;
        for (const [index, candidate] of zonedDateTimeCandidates({ year, month, day, weekday, hour, minute }, timezone).entries()) {
          if (candidate.getTime() <= after.getTime()) continue;
          // First occurrences follow wall-clock order; the second instance of a repeated hour can come before a later wall time.
          if (index === 0) return repeatedCandidate && repeatedCandidate.getTime() < candidate.getTime() ? repeatedCandidate : candidate;
          if (!repeatedCandidate || candidate.getTime() < repeatedCandidate.getTime()) repeatedCandidate = candidate;
        }
      }
    }
    if (repeatedCandidate) return repeatedCandidate;
  }
  throw new RoutineScheduleError("This schedule never runs.");
}

/** Cron semantics: when both day-of-month and weekday are restricted, either may match. */
function calendarMatches(spec: CronSpec, day: number, weekday: number): boolean {
  const dayMatches = spec.day.values.includes(day), weekdayMatches = spec.weekday.values.includes(weekday);
  if (spec.day.wildcard && spec.weekday.wildcard) return true;
  if (spec.day.wildcard) return weekdayMatches;
  if (spec.weekday.wildcard) return dayMatches;
  return dayMatches || weekdayMatches;
}

/** The instants at which a local wall time occurs: none in a daylight-saving gap, two when the clock repeats. */
function zonedDateTimeCandidates(parts: CalendarParts, timezone: string): Date[] {
  const approximate = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const offsets = new Set([-18, 0, 18].map((hours) => {
    const instant = approximate + hours * 3_600_000;
    const local = zonedParts(new Date(instant), timezone);
    return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) - instant;
  }));
  const result: Date[] = [];
  for (const offset of offsets) {
    const candidate = new Date(approximate - offset);
    const value = zonedParts(candidate, timezone);
    if (value.year === parts.year && value.month === parts.month && value.day === parts.day && value.hour === parts.hour && value.minute === parts.minute) {
      result.push(candidate);
    }
  }
  return result.sort((left, right) => left.getTime() - right.getTime());
}

function zonedParts(date: Date, timezone: string): CalendarParts {
  let formatter = formatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    formatterCache.set(timezone, formatter);
  }
  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), weekday: WEEKDAY_INDEX[values.weekday ?? "Sun"] ?? 0,
    hour: Number(values.hour), minute: Number(values.minute) };
}

function validateCronSyntax(expression: string): void {
  const values = expression.trim().split(/\s+/);
  if (values.length !== 5) throw new RoutineScheduleError("A cron expression has five fields: minute, hour, day, month and weekday.");
  const labels = ["minute", "hour", "day", "month", "weekday"];
  values.forEach((source, index) => {
    for (const segment of source.split(",")) {
      const [range = "", step, ...extra] = segment.split("/");
      const parts = [...(range === "*" ? [] : range.split("-")), ...(step === undefined ? [] : [step])];
      if (extra.length || !parts.every((value) => CRON_DECIMAL.test(value))) throw new RoutineScheduleError(`The cron ${labels[index]} field is not valid.`);
    }
  });
}

function parseCron(expression: string): CronSpec {
  const [minute = "", hour = "", day = "", month = "", weekday = ""] = expression.trim().split(/\s+/);
  return { minute: parseCronField(minute, 0, 59, "minute"), hour: parseCronField(hour, 0, 23, "hour"), day: parseCronField(day, 1, 31, "day"),
    month: parseCronField(month, 1, 12, "month"), weekday: parseCronField(weekday, 0, 6, "weekday", true) };
}

function parseCronField(source: string, minimum: number, maximum: number, label: string, sundayAlias = false): CronField {
  const result = new Set<number>();
  for (const segment of source.split(",")) {
    const [range = "", stepSource] = segment.split("/");
    const step = stepSource === undefined ? 1 : Number(stepSource);
    let [start, end] = range === "*" ? [minimum, maximum] : range.includes("-") ? range.split("-").map(Number) : [Number(range), Number(range)];
    if (range !== "*" && !range.includes("-") && stepSource !== undefined) end = maximum;
    const allowedMaximum = sundayAlias ? 7 : maximum;
    if (!Number.isInteger(step) || step < 1 || !Number.isInteger(start) || !Number.isInteger(end) || start < minimum || end > allowedMaximum || end < start) {
      throw new RoutineScheduleError(`The cron ${label} field is not valid.`);
    }
    for (let value = start; value <= end; value += step) result.add(sundayAlias && value === 7 ? 0 : value);
  }
  if (!result.size) throw new RoutineScheduleError(`The cron ${label} field matches nothing.`);
  return { values: [...result].sort((left, right) => left - right), wildcard: source === "*" };
}

function parseTime(value: string): [number, number] {
  const [hour = Number.NaN, minute = Number.NaN] = value.split(":").map(Number);
  return [hour, minute];
}

function field(values: number[]): CronField {
  return { values: [...new Set(values)].sort((left, right) => left - right), wildcard: false };
}

function wildcardField(minimum: number, maximum: number): CronField {
  const values: number[] = [];
  for (let value = minimum; value <= maximum; value += 1) values.push(value);
  return { values, wildcard: true };
}

function intervalMilliseconds(amount: number, unit: RoutineIntervalUnit): number {
  return amount * (unit === "minutes" ? 60_000 : unit === "hours" ? 3_600_000 : 86_400_000);
}
