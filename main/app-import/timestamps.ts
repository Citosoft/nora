/** ISO timestamp from an ISO string or epoch milliseconds; malformed values fall back. */
export function toIsoTimestamp(value: string | number | null | undefined, fallback: string): string {
  if (value === null || value === undefined || value === "") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}
