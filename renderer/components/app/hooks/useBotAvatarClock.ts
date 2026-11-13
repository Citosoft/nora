import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import { botAvatarTime, subscribeBotAvatarClock } from "@/components/app/logic/bot-avatar/clock";

const STILL_TIME = 1;
const noSubscription = (): (() => void) => () => {};
const stillTime = (): number => STILL_TIME;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = (): void => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return reduced;
}

function useOnScreen(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

/** Shared animation time for an on-screen avatar; off-screen or reduced-motion avatars hold a still frame. */
export function useBotAvatarClock(ref: RefObject<Element | null>): number {
  // Both hooks run on every render; short-circuiting them would change hook order when visibility flips.
  const onScreen = useOnScreen(ref);
  const reducedMotion = usePrefersReducedMotion();
  const animate = onScreen && !reducedMotion;
  const subscribe = useCallback((listener: () => void) => subscribeBotAvatarClock(listener), []);
  return useSyncExternalStore(animate ? subscribe : noSubscription, animate ? botAvatarTime : stillTime);
}
