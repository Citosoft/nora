import { memo, useMemo, useRef } from "react";
import { botShapeGeometry } from "@/components/app/logic/bot-avatar/shapes";
import { botEyeStyle, resolveBotAvatar } from "@/components/app/logic/bot-avatar/resolve";
import { botFaceFrame } from "@/components/app/logic/bot-avatar/face";
import { BOT_AVATAR_PALETTE_COLORS } from "@/components/app/constants/botAvatarPalettes";
import { useBotAvatarClock } from "@/components/app/hooks/useBotAvatarClock";
import { BotEyeShape } from "./BotEyeShape";
import type { BotAvatarProps, BotAvatarState, BotFaceProps } from "@/components/app/types/botAvatar.types";

const STATE_LABELS: Readonly<Record<BotAvatarState, string>> = {
  idle: "idle", thinking: "working", speaking: "replying", waiting: "needs you", failed: "failed", settled: "settled"
};

/** A bot's static blob body with animated eyes; motion only ever comes from the face. */
export const BotAvatar = memo(function BotAvatar({ avatar, state = "idle", size, label, className }: BotAvatarProps) {
  const resolved = useMemo(() => resolveBotAvatar(avatar), [avatar]);
  const geometry = botShapeGeometry(resolved.shape);
  const colors = BOT_AVATAR_PALETTE_COLORS[resolved.palette];
  const style = useMemo(() => botEyeStyle(resolved), [resolved]);
  const scale = geometry.faceScale;
  return <svg viewBox="0 0 100 100" width={size} height={size} className={className} role={label ? "img" : undefined}
    aria-label={label ? `${label}, ${STATE_LABELS[state]}` : undefined} aria-hidden={label ? undefined : true}>
    <path d={geometry.path} fill={colors.fill} />
    <g transform={`translate(${50 * (1 - scale)} ${50 * (1 - scale) + geometry.faceOffsetY}) scale(${scale})`}>
      <BotFace style={style} state={state} ink={colors.ink} />
    </g>
  </svg>;
});

function BotFace({ style, state, ink }: BotFaceProps) {
  const ref = useRef<SVGGElement>(null);
  const frame = botFaceFrame(style, state, useBotAvatarClock(ref));
  return <g ref={ref}>
    {frame.eyes.map((eye, index) => <BotEyeShape key={index} eye={eye} ink={ink} />)}
    {frame.sleep && <text x={frame.sleep.x} y={frame.sleep.y} fontSize={10} fill={ink} opacity={frame.sleep.opacity}>z</text>}
  </g>;
}
