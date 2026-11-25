import { useLayoutEffect, useState } from "react";
import { resolveTitleBarContentInset } from "@/components/app/logic/titleBarContentInset";

/**
 * Tracks where the content column starts within the title bar's middle region.
 * Sidebar resizes and collapses change the column's size, and title bar control changes resize the region,
 * so observing both keeps the divider and tabs aligned.
 */
export function useTitleBarContentInset(contentColumn: HTMLElement | null, region: HTMLElement | null): number {
  const [inset, setInset] = useState(0);

  useLayoutEffect(() => {
    if (!contentColumn || !region) {
      setInset(0);
      return;
    }
    const measure = () => {
      setInset(resolveTitleBarContentInset(contentColumn.getBoundingClientRect().left, region.getBoundingClientRect().left));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(contentColumn);
    observer.observe(region);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [contentColumn, region]);

  return inset;
}
