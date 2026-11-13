/** One animation loop shared by every visible avatar; it stops when nothing is subscribed. */
const FRAME_MS = 1000 / 30;
const listeners = new Set<() => void>();
let time = 0;
let frame: number | null = null;
let last = 0;

function tick(now: number): void {
  if (now - last >= FRAME_MS) {
    last = now; time = now / 1000;
    for (const listener of listeners) listener();
  }
  frame = listeners.size ? requestAnimationFrame(tick) : null;
}

export function subscribeBotAvatarClock(listener: () => void): () => void {
  listeners.add(listener);
  if (frame === null) frame = requestAnimationFrame(tick);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && frame !== null) { cancelAnimationFrame(frame); frame = null; }
  };
}

export function botAvatarTime(): number { return time; }
