import type { BotAvatarState, BotEye, BotEyeStyleInput, BotFaceFrame } from "@/components/app/types/botAvatar.types";

const EYE_Y = 50;
const BLINK = 0.08;

/** Eye geometry for a state at time `t` (seconds); the body never moves, so this is the avatar's only animation. */
export function botFaceFrame(style: BotEyeStyleInput, state: BotAvatarState, t: number): BotFaceFrame {
  const blinking = (t + style.blinkPhase) % 4 < 0.12;
  if (state === "settled") {
    return { eyes: [closed(style, -1), closed(style, 1)], sleep: { x: 72, y: 30 - (t * 6) % 10, opacity: 1 - (t * 0.6) % 1 } };
  }
  let y = EYE_Y, lookX = 0, lookY = 0, squash = 1, wide = false;
  switch (state) {
    case "idle": {
      squash = blinking ? BLINK : 1;
      const glance = (t + style.blinkPhase * 2) % 6;
      if (glance > 4.6 && glance < 5.6) lookX = Math.sin((glance - 4.6) * Math.PI) * 2.5 * style.glanceDirection;
      break;
    }
    case "thinking": lookY = -3; lookX = Math.sin(t * 1.2) * 3.5; squash = blinking ? BLINK : 1; break;
    case "speaking": { const beat = Math.abs(Math.sin(t * 7)); y = EYE_Y - beat * 2; squash = 1 - beat * 0.28; break; }
    case "waiting": { const cycle = t % 2.6; wide = true; squash = cycle < 0.1 || (cycle > 0.2 && cycle < 0.3) ? BLINK : 1; break; }
    case "failed": return { eyes: [lowerHalf(style, -1), lowerHalf(style, 1)], sleep: null };
  }
  return { eyes: [open(style, -1, y, lookX, lookY, squash, wide), open(style, 1, y, lookX, lookY, squash, wide)], sleep: null };
}

function open(style: BotEyeStyleInput, side: -1 | 1, y: number, lookX: number, lookY: number, squash: number, wide: boolean): BotEye {
  const x = 50 + side * style.gap, scale = wide ? 1.25 : 1;
  if (style.eyes === "pupil") {
    return { kind: "pupil", cx: x, cy: y, r: 5.6 * scale, squash: Math.max(squash, 0.1),
      pupil: squash > 0.3 ? { cx: x + lookX * 0.7, cy: y + lookY * 0.7, r: 2.9 } : null };
  }
  const rx = (style.eyes === "oval" ? 3.4 : 3.9) * scale, ry = (style.eyes === "oval" ? 5.6 : 4.3) * scale;
  return { kind: "solid", cx: x + lookX, cy: y + lookY, rx, ry: Math.max(ry * squash, 0.7) };
}

function lowerHalf(style: BotEyeStyleInput, side: -1 | 1): BotEye {
  const x = 50 + side * style.gap, y = EYE_Y + 1;
  if (style.eyes === "pupil") return { kind: "lower-half", cx: x, cy: y, rx: 5.6, ry: 5.6, white: true, pupil: { cx: x, cy: y + 2.8, r: 2.9 } };
  return { kind: "lower-half", cx: x, cy: y, rx: style.eyes === "oval" ? 3.4 : 3.9, ry: style.eyes === "oval" ? 5.6 : 4.3, white: false, pupil: null };
}

function closed(style: BotEyeStyleInput, side: -1 | 1): BotEye {
  return { kind: "closed", cx: 50 + side * style.gap, cy: EYE_Y, width: 9 };
}
