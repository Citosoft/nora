import { useEffect, useState } from "react";

/** The current time, re-read every `everyMs`, for labels such as "updated 2 minutes ago" that must age on screen. */
export function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), everyMs); return () => clearInterval(timer); }, [everyMs]);
  return now;
}
