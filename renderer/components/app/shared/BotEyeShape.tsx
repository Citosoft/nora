import type { BotEyeShapeProps } from "@/components/app/types/botAvatar.types";

/** One eye from a face frame. `whiteStroke` outlines eye whites drawn without a body behind them, such as in pickers. */
export function BotEyeShape({ eye, ink, whiteStroke }: BotEyeShapeProps) {
  const white = { fill: "#fff", ...(whiteStroke ? { stroke: whiteStroke, strokeWidth: 1 } : {}) };
  switch (eye.kind) {
    case "solid": return <ellipse cx={eye.cx} cy={eye.cy} rx={eye.rx} ry={eye.ry} fill={ink} />;
    case "pupil": return <>
      <ellipse cx={eye.cx} cy={eye.cy} rx={eye.r} ry={eye.r * eye.squash} {...white} />
      {eye.pupil && <circle cx={eye.pupil.cx} cy={eye.pupil.cy} r={eye.pupil.r} fill={ink} />}
    </>;
    case "lower-half": return <>
      <path d={`M${eye.cx - eye.rx},${eye.cy} a${eye.rx},${eye.ry} 0 0 0 ${eye.rx * 2},0Z`} {...(eye.white ? white : { fill: ink })} />
      {eye.pupil && <circle cx={eye.pupil.cx} cy={eye.pupil.cy} r={eye.pupil.r} fill={ink} />}
    </>;
    case "closed": return <path d={`M${eye.cx - eye.width / 2},${eye.cy} q${eye.width / 2},3.5 ${eye.width},0`} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />;
  }
}
