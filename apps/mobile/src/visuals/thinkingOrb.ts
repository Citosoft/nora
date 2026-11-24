import { MODE_FRAMES, resolvePreset, type OrbState } from "thinking-orbs/engine";
import type { OrbMark, OrbStyle } from "@/types/thinkingOrb.types";

export const orbSize = 32;
export const orbDuration = 4000;
const samples = 48;

/** Sample the desktop orb's geometry once; Reanimated interpolates on the UI thread. */
export function orbMarks(state: OrbState, still = false): OrbMark[] {
  const preset = resolvePreset(state, orbSize);
  const marks: OrbMark[] = [];
  const count = still ? 1 : samples;
  const frames = Array.from({ length: count }, (_, sample) =>
    MODE_FRAMES[preset.mode](orbSize, sample / samples * orbDuration / 1000 * preset.speed, preset.opts));
  const lineCount = Math.max(...frames.map((frame) => frame.lines.length));
  for (const [sample, frame] of frames.entries()) {
    const styles: OrbStyle[] = [
      ...Array.from({ length: lineCount }, (_, index): OrbStyle => {
        const line = frame.lines[index];
        if (!line) return { opacity: 0 };
        return {
          opacity: (1 - line.white) * (line.a ?? 1),
          transform: [
            { translateX: (line.x1 + line.x2) / 2 - 1 }, { translateY: (line.y1 + line.y2) / 2 - 1 },
            { rotate: `${Math.atan2(line.y2 - line.y1, line.x2 - line.x1)}rad` },
            { scaleX: Math.hypot(line.x2 - line.x1, line.y2 - line.y1) / 2 }, { scaleY: line.w / 2 }
          ]
        };
      }),
      ...frame.dots.map((dot): OrbStyle => ({
        opacity: (1 - dot.white) * (dot.a ?? 1),
        transform: [{ translateX: dot.x - 1 }, { translateY: dot.y - 1 }, { scale: dot.r }]
      }))
    ];
    const total = Math.max(marks.length, styles.length);
    for (let index = 0; index < total; index++) {
      const style = styles[index] ?? { opacity: 0 };
      let mark = marks[index];
      if (!mark) {
        mark = { initial: style, keyframes: { "0%": { ...style, opacity: 0 } } };
        marks.push(mark);
      }
      mark.keyframes[`${sample / Math.max(1, count - 1) * 100}%`] = style;
    }
  }
  return marks;
}
