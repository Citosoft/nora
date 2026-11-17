/** Capped exponential backoff with "equal jitter": half the window fixed, half random, so retries never bunch at zero. */
export function backoffDelay(attempt: number, baseMs: number, maxMs: number, random: () => number): number {
  const ceiling = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  return Math.round(ceiling / 2 + random() * (ceiling / 2));
}
