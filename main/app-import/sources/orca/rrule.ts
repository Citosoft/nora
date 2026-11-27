import type { RoutineSchedule } from "@shared/types/bots/routines.types";

export type OrcaScheduleConversion = { status: "converted"; schedule: RoutineSchedule } | { status: "unsupported"; reason: string };

const WEEKDAYS: Readonly<Record<string, number>> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const UNSUPPORTED: OrcaScheduleConversion = { status: "unsupported", reason: "Its repeat rule has no Nora equivalent." };

function rules(rrule: string): Map<string, string> {
  const body = rrule.trim().replace(/^RRULE:/i, "");
  return new Map(body.split(";").flatMap((part) => {
    const [key, value] = part.split("=");
    return key && value ? [[key.trim().toUpperCase(), value.trim().toUpperCase()] as const] : [];
  }));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** The wall-clock time the rule fires: BYHOUR/BYMINUTE when given, otherwise DTSTART on the routine's clock. */
function timeOf(parts: Map<string, string>, dtstart: number, timezone: string): { hour: number; minute: number } | null {
  const byHour = parts.get("BYHOUR");
  const byMinute = parts.get("BYMINUTE");
  if (byHour?.includes(",") || byMinute?.includes(",")) return null;
  let start: { hour: number; minute: number };
  try {
    const formatted = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(dtstart));
    start = { hour: Number(formatted.find((part) => part.type === "hour")?.value ?? 0), minute: Number(formatted.find((part) => part.type === "minute")?.value ?? 0) };
  } catch {
    start = { hour: 0, minute: 0 };
  }
  return { hour: byHour ? Number(byHour) : start.hour, minute: byMinute ? Number(byMinute) : start.minute };
}

/** Converts the RRULEs Orca's schedule editor writes into Nora routine schedules; anything richer is reported instead. */
export function orcaRruleSchedule(rrule: string, dtstart: number, timezone: string): OrcaScheduleConversion {
  const parts = rules(rrule);
  if (parts.has("COUNT") || parts.has("UNTIL") || parts.has("BYSETPOS")) return UNSUPPORTED;
  const interval = Number(parts.get("INTERVAL") ?? "1");
  if (!Number.isInteger(interval) || interval < 1) return UNSUPPORTED;
  const time = timeOf(parts, dtstart, timezone);
  if (!time) return UNSUPPORTED;
  const clock = `${pad(time.hour)}:${pad(time.minute)}`;
  const anchorAt = new Date(dtstart).toISOString();
  switch (parts.get("FREQ")) {
    case "MINUTELY": return { status: "converted", schedule: { kind: "interval", amount: interval, unit: "minutes", anchorAt } };
    case "HOURLY": return { status: "converted", schedule: interval === 1 ? { kind: "hourly", minute: time.minute } : { kind: "interval", amount: interval, unit: "hours", anchorAt } };
    case "DAILY": return { status: "converted", schedule: interval === 1 ? { kind: "daily", time: clock } : { kind: "interval", amount: interval, unit: "days", anchorAt } };
    case "WEEKLY": {
      if (interval !== 1) return UNSUPPORTED;
      const days = (parts.get("BYDAY") ?? "").split(",").filter(Boolean).map((day) => WEEKDAYS[day]);
      if (days.some((day) => day === undefined)) return UNSUPPORTED;
      const weekdays = days.filter((day): day is number => day !== undefined).sort();
      if (weekdays.join(",") === "1,2,3,4,5") return { status: "converted", schedule: { kind: "weekdays", time: clock } };
      if (weekdays.length === 1 && weekdays[0] !== undefined) return { status: "converted", schedule: { kind: "weekly", weekday: weekdays[0], time: clock } };
      if (weekdays.length > 1) return { status: "converted", schedule: { kind: "custom", expression: `${time.minute} ${time.hour} * * ${weekdays.join(",")}` } };
      return UNSUPPORTED;
    }
    case "MONTHLY": {
      const day = Number(parts.get("BYMONTHDAY") ?? "");
      return interval === 1 && Number.isInteger(day) && day >= 1 && day <= 31 ? { status: "converted", schedule: { kind: "monthly", day, time: clock } } : UNSUPPORTED;
    }
    default: return UNSUPPORTED;
  }
}
