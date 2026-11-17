import type { BotFaceEyesProps } from "@/components/app/types/botAvatar.types";

/** A face's eyes drawn in `currentColor`; open eyes sit in a group the avatar CSS animates. */
export function BotFaceEyes({ eyes }: BotFaceEyesProps) {
  if (eyes.kind === "line") {
    return <g fill="none" stroke="currentColor" strokeWidth={4.5} strokeLinecap="round">
      {eyes.paths.map((d) => <path key={d} d={d} />)}
    </g>;
  }
  return <g className="bot-avatar-eyes" fill="currentColor">
    {eyes.eyes.map((eye, index) => eye.kind === "circle"
      ? <circle key={index} cx={eye.cx} cy={eye.cy} r={eye.r} />
      : <rect key={index} x={eye.x} y={eye.y} width={eye.width} height={eye.height} rx={eye.rx} />)}
  </g>;
}
