/** A bounded sliding-window limiter; unauthenticated clients cannot grow per-session state. */
export function createRuntimeRateLimit(now: () => number, maximum = 120, windowMs = 60_000): (key: string) => boolean {
  const entries = new Map<string, number[]>();
  return (key) => {
    const cutoff = now() - windowMs;
    for (const [id, times] of entries) if ((times.at(-1) ?? 0) <= cutoff) entries.delete(id);
    const recent = (entries.get(key) ?? []).filter((time) => time > cutoff);
    if (recent.length >= maximum || (!entries.has(key) && entries.size >= 1024)) return false;
    recent.push(now()); entries.set(key, recent); return true;
  };
}
