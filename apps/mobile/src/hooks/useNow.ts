import { useEffect, useState } from "react";

/** The current time, re-rendered on an interval so relative timestamps stay accurate. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const handle = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(handle);
  }, [intervalMs]);
  return now;
}
