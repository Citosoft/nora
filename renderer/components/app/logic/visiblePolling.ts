/** Refresh mounted views immediately on return and release the timer while hidden. */
export function startVisiblePolling(refresh: () => void, intervalMs: number): () => void {
  let timer: number | undefined;
  const sync = () => {
    window.clearInterval(timer);
    if (document.hidden) return;
    refresh();
    timer = window.setInterval(refresh, intervalMs);
  };
  document.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    document.removeEventListener("visibilitychange", sync);
    window.clearInterval(timer);
  };
}
