import { useEffect, useState } from "react";

/** One clock for the list, rather than a timer in every row. */
export function useThreadTime(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const update = (): void => setNow(Date.now());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  return now;
}
