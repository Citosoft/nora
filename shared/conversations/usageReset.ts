/** Provider protocols express reset timestamps as Unix seconds. */
export function usageResetTimestamp(seconds: number | null | undefined): string | undefined {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
