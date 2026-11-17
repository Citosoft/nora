import type { RoutineCalendar } from "@shared/types/bots/routines.types";
import type { CalendarDay, RoutineCalendarDayEntry, RoutineCalendarSpan, RoutineCalendarView } from "@/components/app/types/routineCalendar.types";

/**
 * Calendar arithmetic on the viewer's own clock. Days are "YYYY-MM-DD" strings so they compare and key maps without timezone
 * surprises; ranges sent to main are the local midnights around them.
 */

const pad = (value: number): string => String(value).padStart(2, "0");
const toDate = (day: CalendarDay): Date => { const [year, month, date] = day.split("-").map(Number); return new Date(year, month - 1, date); };

export function calendarDayOf(date: Date): CalendarDay {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(day: CalendarDay, amount: number): CalendarDay {
  const date = toDate(day);
  return calendarDayOf(new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount));
}

function monthStart(day: CalendarDay): CalendarDay { return `${day.slice(0, 8)}01`; }
function weekStart(day: CalendarDay, weekStartsOn: number): CalendarDay { return addDays(day, -((toDate(day).getDay() - weekStartsOn + 7) % 7)); }
function daysFrom(start: CalendarDay, count: number): CalendarDay[] { return Array.from({ length: count }, (_, index) => addDays(start, index)); }

/** The days a view shows around its anchor, and the instants that bound them: a month grid is whole weeks, four to six rows. */
export function calendarSpan(view: RoutineCalendarView, anchor: CalendarDay, weekStartsOn = 1): RoutineCalendarSpan {
  let days: CalendarDay[];
  if (view === "day") days = [anchor];
  else if (view === "week") days = daysFrom(weekStart(anchor, weekStartsOn), 7);
  else {
    const first = weekStart(monthStart(anchor), weekStartsOn);
    const lastOfMonth = calendarDayOf(new Date(toDate(anchor).getFullYear(), toDate(anchor).getMonth() + 1, 0));
    const last = addDays(weekStart(lastOfMonth, weekStartsOn), 6);
    days = daysFrom(first, Math.round((toDate(last).getTime() - toDate(first).getTime()) / 86_400_000) + 1);
  }
  return { days, from: toDate(days[0]).toISOString(), to: toDate(addDays(days[days.length - 1], 1)).toISOString() };
}

/** The anchor one view-length earlier or later; a month move keeps to the first of the month so short months never skip. */
export function moveCalendarAnchor(view: RoutineCalendarView, anchor: CalendarDay, delta: -1 | 1): CalendarDay {
  if (view === "day") return addDays(anchor, delta);
  if (view === "week") return addDays(anchor, delta * 7);
  const date = toDate(anchor);
  return calendarDayOf(new Date(date.getFullYear(), date.getMonth() + delta, 1));
}

export function sameMonth(day: CalendarDay, other: CalendarDay): boolean { return day.slice(0, 7) === other.slice(0, 7); }

/** The heading for a view, such as "November 2026", "16 – 22 Nov 2026" or "Monday 16 November". */
export function calendarTitle(view: RoutineCalendarView, anchor: CalendarDay, days: readonly CalendarDay[]): string {
  const format = (day: CalendarDay, options: Intl.DateTimeFormatOptions): string => new Intl.DateTimeFormat("en-GB", options).format(toDate(day));
  if (view === "month") return format(anchor, { month: "long", year: "numeric" });
  if (view === "day") return dayLabel(anchor);
  const first = days[0], last = days[days.length - 1];
  return `${format(first, sameMonth(first, last) ? { day: "numeric" } : { day: "numeric", month: "short" })} – ${format(last, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function weekdayLabel(day: CalendarDay, length: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: length }).format(toDate(day));
}

export function dayOfMonth(day: CalendarDay): number { return toDate(day).getDate(); }

/** A day spelled out for screen readers and buttons, such as "Monday 16 November 2026". */
export function dayLabel(day: CalendarDay): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(toDate(day));
}

/** The viewer's local time of an entry, "09:00". */
export function entryTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

/** Entries grouped by the local day they fall on, each with its routine; entries of routines no longer listed are dropped. */
export function entriesByDay(calendar: RoutineCalendar | null): Map<CalendarDay, RoutineCalendarDayEntry[]> {
  const byDay = new Map<CalendarDay, RoutineCalendarDayEntry[]>();
  if (!calendar) return byDay;
  const routines = new Map(calendar.routines.map((entry) => [entry.routine.id, entry]));
  for (const entry of calendar.entries) {
    const routine = routines.get(entry.routineId);
    if (!routine) continue;
    const day = calendarDayOf(new Date(entry.at));
    const list = byDay.get(day);
    if (list) list.push({ entry, routine }); else byDay.set(day, [{ entry, routine }]);
  }
  return byDay;
}
