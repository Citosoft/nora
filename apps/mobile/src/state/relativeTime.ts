const units: [limitSeconds: number, divisor: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60, 1, "second"], [3_600, 60, "minute"], [86_400, 3_600, "hour"], [604_800, 86_400, "day"], [2_629_800, 604_800, "week"],
  [31_557_600, 2_629_800, "month"], [Number.POSITIVE_INFINITY, 31_557_600, "year"]
];

/** "5 minutes ago", "yesterday"; under ten seconds reads "just now". */
export function relativeTime(iso: string, now: Date): string {
  const seconds = (Date.parse(iso) - now.getTime()) / 1000;
  if (Number.isNaN(seconds)) return "";
  if (Math.abs(seconds) < 10) return "just now";
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [limit, divisor, unit] of units) {
    if (Math.abs(seconds) < limit) return format.format(Math.round(seconds / divisor), unit);
  }
  return "";
}
