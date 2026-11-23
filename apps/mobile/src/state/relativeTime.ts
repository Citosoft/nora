import type { FormatRelative } from "@/types/relativeTime.types";

const units: [limitSeconds: number, divisor: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60, 1, "second"], [3_600, 60, "minute"], [86_400, 3_600, "hour"], [604_800, 86_400, "day"], [2_629_800, 604_800, "week"],
  [31_557_600, 2_629_800, "month"], [Number.POSITIVE_INFINITY, 31_557_600, "year"]
];

/** Words `numeric: "auto"` uses for ±1 of a calendar unit; other units and values fall back to "N units ago/in N units". */
const adjacentWords: Partial<Record<Intl.RelativeTimeFormatUnit, readonly [past: string, future: string]>> = {
  day: ["yesterday", "tomorrow"],
  week: ["last week", "next week"],
  month: ["last month", "next month"],
  year: ["last year", "next year"]
};

/**
 * English stand-in for `Intl.RelativeTimeFormat` with `numeric: "auto"`. Hermes on iOS ships without that constructor,
 * so calling it there throws and React Native aborts the app.
 */
export const formatRelativeEnglish: FormatRelative = (value, unit) => {
  const adjacent = adjacentWords[unit];
  if (adjacent && Math.abs(value) === 1) return value < 0 ? adjacent[0] : adjacent[1];
  const count = Math.abs(value);
  const label = `${count} ${unit}${count === 1 ? "" : "s"}`;
  return value < 0 ? `${label} ago` : `in ${label}`;
};

let cachedFormat: FormatRelative | null = null;

function relativeFormatter(): FormatRelative {
  if (cachedFormat) return cachedFormat;
  if (typeof Intl !== "undefined" && typeof Intl.RelativeTimeFormat === "function") {
    const intl = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    cachedFormat = (value, unit) => intl.format(value, unit);
  } else {
    cachedFormat = formatRelativeEnglish;
  }
  return cachedFormat;
}

/** "5 minutes ago", "yesterday"; under ten seconds reads "just now". */
export function relativeTime(iso: string, now: Date): string {
  const seconds = (Date.parse(iso) - now.getTime()) / 1000;
  if (Number.isNaN(seconds)) return "";
  if (Math.abs(seconds) < 10) return "just now";
  const format = relativeFormatter();
  for (const [limit, divisor, unit] of units) {
    if (Math.abs(seconds) < limit) return format(Math.round(seconds / divisor), unit);
  }
  return "";
}
