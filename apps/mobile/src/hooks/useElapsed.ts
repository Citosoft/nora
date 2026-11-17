import { useEffect, useState } from "react";

/** True once `active` has stayed true for `delayMs`; resets when it turns false. */
export function useElapsed(active: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    setElapsed(false);
    if (!active) return undefined;
    const handle = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(handle);
  }, [active, delayMs]);
  return elapsed;
}
