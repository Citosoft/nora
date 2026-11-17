import type { BotAvatarState, BotFaceEyes, BotFaceEyeShape, BotFaceStyle } from "@/components/app/types/botAvatar.types";

/**
 * Eye geometry in the 100-unit face box. Active states share the open eyes (CSS animates them per
 * state); failed and settled swap them for flat and closed lines.
 */
export function botFaceEyes(style: Pick<BotFaceStyle, "eyes" | "gap">, state: BotAvatarState): BotFaceEyes {
  const [left, right] = [50 - style.gap, 50 + style.gap];
  if (state === "settled") return { kind: "line", paths: [`M${left - 6} 50 q6 5 12 0`, `M${right - 6} 50 q6 5 12 0`] };
  if (state === "failed") return { kind: "line", paths: [`M${left - 5} 55 h10`, `M${right - 5} 55 h10`] };
  return { kind: "open", eyes: [openEye(style.eyes, left), openEye(style.eyes, right)] };
}

function openEye(eyes: BotFaceStyle["eyes"], x: number): BotFaceEyeShape {
  switch (eyes) {
    case "oval": return { kind: "rect", x: x - 4.5, y: 39, width: 9, height: 20, rx: 4.5 };
    case "dot": return { kind: "circle", cx: x, cy: 49, r: 6.5 };
    case "pupil": return { kind: "rect", x: x - 7, y: 44, width: 14, height: 10, rx: 5 };
  }
}
