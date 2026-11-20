import type { AppRow } from "@/components/app/types/apps.types";
import type { CalendarDay, CalendarMonth } from "@/components/app/types/appsComponents.types";

const DAY_MS = 86_400_000;
export const dayKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** A row's date as a local calendar day, or null when the field is missing or unreadable. */
export function rowDate(row: AppRow, key: string): Date | null {
  const value = row[key];
  if (typeof value !== "string" && typeof value !== "number") return null;
  // A bare date is a calendar day, not midnight UTC, so it must not shift by the timezone.
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The weeks of a month (Monday first), padded with the neighbouring days, with each day's rows. */
export function calendarMonth(year: number, month: number, rows: readonly AppRow[], dateKey: string, today = new Date()): CalendarMonth {
  const byDay = new Map<string, AppRow[]>();
  for (const row of rows) { const date = rowDate(row, dateKey); if (date) (byDay.get(dayKey(date)) ?? byDay.set(dayKey(date), []).get(dayKey(date)))!.push(row); }
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);
  const todayKey = dayKey(today);
  const weeks: CalendarDay[][] = [];
  for (let offset = 0; offset < 42; offset += 7) {
    const week: CalendarDay[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(start.getTime() + (offset + day) * DAY_MS);
      const key = dayKey(date);
      week.push({ key, day: date.getDate(), inMonth: date.getMonth() === month, today: key === todayKey, rows: byDay.get(key) ?? [] });
    }
    weeks.push(week);
    if (offset >= 28 && week[6]!.inMonth === false && new Date(start.getTime() + (offset + 7) * DAY_MS).getMonth() !== month) break;
  }
  return { label: first.toLocaleDateString(undefined, { month: "long", year: "numeric" }), weeks };
}

/** Rows with a readable date, in date order, grouped by day for a timeline. */
export function timelineGroups(rows: readonly AppRow[], dateKey: string, order: "newest" | "oldest"): { key: string; label: string; rows: AppRow[] }[] {
  const dated = rows.flatMap((row) => { const date = rowDate(row, dateKey); return date ? [{ row, date }] : []; })
    .sort((a, b) => order === "newest" ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime());
  const groups: { key: string; label: string; rows: AppRow[] }[] = [];
  for (const { row, date } of dated) {
    const key = dayKey(date);
    const last = groups.at(-1);
    if (last?.key === key) last.rows.push(row);
    else groups.push({ key, label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }), rows: [row] });
  }
  return groups;
}
