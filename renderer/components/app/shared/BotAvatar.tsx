import { memo, useMemo } from "react";
import type { CSSProperties } from "react";
import { botShapeGeometry } from "@/components/app/logic/bot-avatar/shapes";
import { botFaceStyle, resolveBotAvatar } from "@/components/app/logic/bot-avatar/resolve";
import { botFaceEyes } from "@/components/app/logic/bot-avatar/face";
import { BOT_AVATAR_PALETTE_COLORS } from "@/components/app/constants/botAvatarPalettes";
import { BotFaceEyes } from "./BotFaceEyes";
import type { BotAvatarProps, BotAvatarState } from "@/components/app/types/botAvatar.types";

const STATE_LABELS: Readonly<Record<BotAvatarState, string>> = {
  idle: "idle", thinking: "working", speaking: "replying", waiting: "needs you", failed: "failed", settled: "settled"
};
/** Shapes are normalised to 68 units; the Line body fills 84, and the "needs you" ring sits just outside it. */
const BODY_SCALE = 84 / 68;
const RING_SCALE = BODY_SCALE * 1.13;
const scaleAboutCentre = (scale: number): string => `translate(50 51) scale(${scale}) translate(-50 -51)`;

/**
 * A bot's face in the Line style: a monoline outline in the bot's colour (deeper on light themes,
 * brighter on dark) with eyes that carry the state. Motion lives in CSS (`.bot-avatar` in styles.css).
 */
export const BotAvatar = memo(function BotAvatar({ avatar, state = "idle", size, label, className }: BotAvatarProps) {
  const resolved = useMemo(() => resolveBotAvatar(avatar), [avatar]);
  const face = useMemo(() => botFaceStyle(resolved), [resolved]);
  const geometry = botShapeGeometry(resolved.shape);
  const colors = BOT_AVATAR_PALETTE_COLORS[resolved.palette];
  const faceScale = geometry.faceScale;
  const style = {
    "--bot-avatar-deep": colors.deep, "--bot-avatar-light": colors.light, "--bot-avatar-blink": `${face.blinkDelaySeconds.toFixed(2)}s`
  } as CSSProperties;
  return <svg viewBox="0 0 100 100" width={size} height={size} className={`bot-avatar ${className ?? ""}`} data-state={state} style={style}
    role={label ? "img" : undefined} aria-label={label ? `${label}, ${STATE_LABELS[state]}` : undefined} aria-hidden={label ? undefined : true}
    focusable="false">
    <path className="bot-avatar-ring" d={geometry.path} transform={scaleAboutCentre(RING_SCALE)} fill="none" strokeWidth={3 / RING_SCALE} />
    <g className="bot-avatar-body">
      <path d={geometry.path} transform={scaleAboutCentre(BODY_SCALE)} fill="currentColor" fillOpacity={0.1} stroke="currentColor"
        strokeWidth={5 / BODY_SCALE} strokeLinejoin="round" />
    </g>
    <g transform={`translate(${50 * (1 - faceScale)} ${50 * (1 - faceScale) + geometry.faceOffsetY * BODY_SCALE}) scale(${faceScale})`}>
      <BotFaceEyes eyes={botFaceEyes(face, state)} />
    </g>
  </svg>;
});
