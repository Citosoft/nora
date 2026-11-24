import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { PixelFieldProps } from "@/types/pixelField.types";
import { defaultShading, gridFor, pixelCell, terrainAlpha, terrainLoopMs } from "@/visuals/pixelTerrain";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/hooks/useTheme";

/** ~15fps is plenty for a slow drift, as on the website. */
const frameIntervalMs = 66;

/** Web: the same dot terrain drawn on a canvas each frame from the shared terrain model. Decorative and hidden from assistive tech. */
export function PixelField({ style, color, intensity = defaultShading.intensity, edgeFade = defaultShading.edgeFade, bottomFade = defaultShading.bottomFade }: PixelFieldProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ink = color ?? colors.text;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;
    let frame = 0;
    let last = -Infinity;

    const resize = (): void => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * ratio;
      canvas.height = canvas.clientHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (time: number): void => {
      const grid = gridFor(canvas.clientWidth, canvas.clientHeight);
      const phase = (time % terrainLoopMs) / terrainLoopMs;
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      context.fillStyle = ink;
      for (let column = 0; column < grid.columns; column++) {
        for (let row = 0; row < grid.rows; row++) {
          const alpha = terrainAlpha(column, row, grid, phase, { intensity, edgeFade, bottomFade });
          if (!alpha) continue;
          context.globalAlpha = alpha;
          context.beginPath();
          context.roundRect(column * pixelCell.pitch, row * pixelCell.pitch, pixelCell.size, pixelCell.size, pixelCell.radius);
          context.fill();
        }
      }
      context.globalAlpha = 1;
    };
    const loop = (time: number): void => {
      frame = requestAnimationFrame(loop);
      if (document.hidden || time - last < frameIntervalMs) return;
      last = time;
      draw(time);
    };

    resize();
    draw(0);
    const observer = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    observer.observe(canvas);
    if (!reduced) frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [bottomFade, edgeFade, ink, intensity, reduced]);

  return (
    <View pointerEvents="none" aria-hidden style={[styles.field, style]}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </View>
  );
}

const styles = StyleSheet.create({ field: { overflow: "hidden" } });
