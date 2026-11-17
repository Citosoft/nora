import type { RoutineSchedule } from "@shared/types/bots/routines.types";

export const ROUTINE_WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${["th", "st", "nd", "rd"][value % 10] ?? "th"}`;
}

function plural(amount: number, unit: string): string {
  return amount === 1 ? unit.replace(/s$/, "") : `${amount} ${unit}`;
}

/** One line for a schedule, such as "Weekdays at 09:00" or "Every 2 hours"; times are on the routine's own clock. */
export function describeRoutineSchedule(schedule: RoutineSchedule): string {
  switch (schedule.kind) {
    case "hourly": return `Every hour at :${String(schedule.minute).padStart(2, "0")}`;
    case "daily": return `Every day at ${schedule.time}`;
    case "weekdays": return `Weekdays at ${schedule.time}`;
    case "weekly": return `Every ${ROUTINE_WEEKDAY_NAMES[schedule.weekday]} at ${schedule.time}`;
    case "monthly": return `Monthly on the ${ordinal(schedule.day)} at ${schedule.time}`;
    case "interval": return `Every ${plural(schedule.amount, schedule.unit)}`;
    case "custom": return `Cron: ${schedule.expression}`;
    case "once": return `Once on ${schedule.date} at ${schedule.time}`;
  }
}

/** An instant on the routine's clock, such as "Mon 17 Nov, 09:00 (Europe/London)". */
export function formatRoutineInstant(iso: string, timezone: string): string {
  const text = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23" }).format(new Date(iso));
  return `${text} (${timezone})`;
}
