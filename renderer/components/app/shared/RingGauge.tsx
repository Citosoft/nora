import { cn } from "@/lib/utils";
import type { GaugeRingValue, RingGaugeProps, UsageTone } from "@/components/app/types/toolUsage.types";

const TONE_CLASS: Record<UsageTone, string> = {
  normal: "text-primary",
  warning: "text-amber-500",
  critical: "text-destructive"
};
const VIEWBOX_RADIUS = 12;
const RING_GAP = 2;

function Ring({ radius, stroke, value }: { radius: number; stroke: number; value: GaugeRingValue | null }) {
  return <>
    <circle cx="12" cy="12" r={radius} fill="none" strokeWidth={stroke} className="stroke-muted-foreground/20" />
    {value && value.percentUsed > 0 && <circle cx="12" cy="12" r={radius} fill="none" strokeWidth={stroke} pathLength={100}
      strokeDasharray={`${Math.min(value.percentUsed, 100)} 100`} strokeLinecap={value.percentUsed >= 100 ? "butt" : "round"}
      className={cn("stroke-current transition-[stroke-dasharray] duration-500 motion-reduce:transition-none", TONE_CLASS[value.tone])} />}
  </>;
}

/** Concentric percentage rings, outermost first; a single ring is drawn slightly thicker. */
export function RingGauge({ rings, className }: RingGaugeProps) {
  const stroke = rings.length === 1 ? 3.5 : 3;
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-5 -rotate-90", className)}>
    {rings.map((value, index) => <Ring key={index} value={value} stroke={stroke}
      radius={VIEWBOX_RADIUS - stroke / 2 - index * (stroke + RING_GAP)} />)}
  </svg>;
}
