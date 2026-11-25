import { useEffect, useRef } from "react";
import { DOT_TERRAIN_FRAME_INTERVAL_MS, dotTerrainCellAt, dotTerrainCellKey, drawDotTerrainFrame, drawDotTerrainGlows } from "@/components/app/logic/dotTerrain";
import type { DotTerrainGlows, DotTerrainLook } from "@/components/app/types/dotTerrain.types";

/** Marks the cell under the cursor as lit; its fade starts once the cursor moves off it. */
const LIT = Number.POSITIVE_INFINITY;

/**
 * Runs the dot-matrix terrain on a canvas: sizes it to the device pixel ratio, follows the
 * theme ink (the canvas's CSS `color`), lights the cell under the cursor and fades it out as
 * the cursor moves on, and pauses while off-screen or the window is hidden. With reduced
 * motion the terrain holds still and only the cursor glow animates.
 */
export function useDotTerrainCanvas({ intensity, clearing }: DotTerrainLook) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const glows: DotTerrainGlows = new Map();
    let hovered: number | null = null;
    let frame = 0;
    let onScreen = true;
    let last = 0;
    let color = "#000";

    const draw = (time: number) => {
      const size = { width: canvas.clientWidth, height: canvas.clientHeight };
      drawDotTerrainFrame(context, { ...size, time: motion.matches ? 0 : time / 1000, color, intensity, clearing });
      drawDotTerrainGlows(context, glows, time, color);
    };
    const active = () => onScreen && !document.hidden;
    const loop = (time: number) => {
      // Fading glows need every frame; the drift alone is fine at ~15fps.
      if (glows.size || time - last >= DOT_TERRAIN_FRAME_INTERVAL_MS) {
        last = time;
        draw(time);
      }
      frame = active() && (glows.size || !motion.matches) ? requestAnimationFrame(loop) : 0;
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = active() && (glows.size || !motion.matches) ? requestAnimationFrame(loop) : 0;
    };
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * ratio;
      canvas.height = canvas.clientHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      color = getComputedStyle(canvas).color;
      draw(performance.now());
    };
    const release = () => {
      if (hovered !== null) glows.set(hovered, performance.now());
      hovered = null;
    };
    // The backdrop sits behind the thread's content and takes no pointer events, so follow the cursor at window level.
    const track = (event: PointerEvent) => {
      if (!active()) return;
      const rect = canvas.getBoundingClientRect();
      const cell = dotTerrainCellAt(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
      const key = cell ? dotTerrainCellKey(cell) : null;
      if (key === hovered) return;
      release();
      if (key !== null) {
        glows.set(key, LIT);
        hovered = key;
      }
      if (!frame) sync();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      sync();
    });
    intersection.observe(canvas);
    // appTheme flips the `dark` class and data-theme on <html>; accent changes adjust inline styles.
    const themeObserver = new MutationObserver(resize);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    window.addEventListener("pointermove", track, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("pointermove", track);
      document.documentElement.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [intensity, clearing]);

  return ref;
}
