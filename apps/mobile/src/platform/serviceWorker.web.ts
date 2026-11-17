/**
 * Web: registers the app-shell service worker in production builds only, so development never serves a stale bundle.
 * `sw.js` must be served with `Cache-Control: no-cache` so browsers pick up new deploys.
 */
export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const register = (): void => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // The app works without it; it only speeds up reopening and gives an offline shell.
    });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
