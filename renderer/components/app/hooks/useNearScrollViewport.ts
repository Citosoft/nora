import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Whether an element is within `margin` of its scroll container's visible area. Observing against the scroller
 * (not the window) lets the margin reach past the scroller's clip, so content mounts before it scrolls into view.
 */
export function useNearScrollViewport<T extends Element>(root: Element | null, margin: string): { ref: RefObject<T | null>; near: boolean } {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || !root) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries.at(-1);
      if (entry) setNear(entry.isIntersecting);
    }, { root, rootMargin: margin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [root, margin]);
  return { ref, near };
}
