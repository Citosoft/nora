import type { SubscribeToForeground } from "@/types/platform.types";

/** Web: the tab becoming visible again or the browser coming back online. */
export const subscribeToForeground: SubscribeToForeground = (listener) => {
  if (typeof window === "undefined" || typeof document === "undefined") return () => undefined;
  const onVisibility = (): void => {
    if (document.visibilityState === "visible") listener();
  };
  window.addEventListener("online", listener);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("online", listener);
    document.removeEventListener("visibilitychange", onVisibility);
  };
};
