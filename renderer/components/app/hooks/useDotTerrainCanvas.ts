import { useEffect, useRef } from "react";
import { buildDotTerrainGrid, DOT_TERRAIN_FRAME_INTERVAL_MS, dotTerrainCellAt, dotTerrainCellKey, drawDotTerrainFrame, drawDotTerrainGlows } from "@/components/app/logic/dotTerrain";
import type { DotTerrainCanvasOptions, DotTerrainGlows } from "@/components/app/types/dotTerrain.types";

const LIT = Number.POSITIVE_INFINITY;

export function useDotTerrainCanvas({ intensity, clearing, drifting }: DotTerrainCanvasOptions) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Read through refs so toggling the drift pauses or resumes in place instead of rebuilding the canvas.
  const driftingRef = useRef(drifting);
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const glows: DotTerrainGlows = new Map();
    let hovered: number | null = null;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onScreen = false;
    let focused = document.hasFocus();
    let color = getComputedStyle(canvas).color;
    let bounds = canvas.getBoundingClientRect();
    let grid = buildDotTerrainGrid(0, 0, { intensity, clearing });
    let drift = 0;

    const active = () => onScreen && focused && !document.hidden;
    const draw = (time: number) => {
      drawDotTerrainFrame(context, { grid, time: motion.matches ? 0 : drift, color });
      drawDotTerrainGlows(context, glows, time, color);
    };
    const moving = () => !motion.matches && driftingRef.current;
    const fading = () => !motion.matches && [...glows.values()].some((litAt) => litAt !== LIT);
    const paint = (time: number) => {
      frame = 0;
      if (!active()) return;
      if (moving()) drift += DOT_TERRAIN_FRAME_INTERVAL_MS / 1000;
      draw(time);
      // A still terrain keeps ticking only until released cursor glows have faded out.
      if (moving() || fading()) {
        timer = setTimeout(() => { timer = undefined; requestPaint(); }, DOT_TERRAIN_FRAME_INTERVAL_MS);
      }
    };
    const requestPaint = () => {
      if (!frame && timer === undefined && active()) frame = requestAnimationFrame(paint);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      frame = 0;
      timer = undefined;
    };
    const sync = () => { stop(); requestPaint(); };
    const resize = () => {
      bounds = canvas.getBoundingClientRect();
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (width !== grid.width || height !== grid.height) {
        // A CSS-pixel backing buffer keeps the cost independent of display scaling.
        canvas.width = width;
        canvas.height = height;
        grid = buildDotTerrainGrid(width, height, { intensity, clearing });
      }
      requestPaint();
    };
    const release = () => {
      if (hovered === null) return;
      if (motion.matches) glows.delete(hovered);
      else glows.set(hovered, performance.now());
      hovered = null;
      requestPaint();
    };
    const track = (event: PointerEvent) => {
      if (!active()) return;
      const cell = dotTerrainCellAt(event.clientX - bounds.left, event.clientY - bounds.top, bounds.width, bounds.height);
      const key = cell ? dotTerrainCellKey(cell) : null;
      if (key === hovered) return;
      release();
      if (key !== null) {
        glows.set(key, LIT);
        hovered = key;
        requestPaint();
      }
    };
    const focus = () => { focused = true; resize(); sync(); };
    const blur = () => { focused = false; glows.clear(); hovered = null; stop(); };
    const motionChange = () => {
      glows.clear();
      if (hovered !== null) glows.set(hovered, LIT);
      sync();
    };

    wakeRef.current = sync;
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      if (onScreen) resize();
      sync();
    });
    intersection.observe(canvas);
    const themeObserver = new MutationObserver(() => {
      const next = getComputedStyle(canvas).color;
      if (next !== color) { color = next; requestPaint(); }
    });
    const root = document.documentElement;
    themeObserver.observe(root, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    window.addEventListener("pointermove", track, { passive: true });
    root.addEventListener("pointerleave", release);
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", motionChange);

    return () => {
      wakeRef.current = null;
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", track);
      root.removeEventListener("pointerleave", release);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", motionChange);
    };
  }, [intensity, clearing]);

  useEffect(() => {
    driftingRef.current = drifting;
    wakeRef.current?.();
  }, [drifting]);

  return ref;
}
