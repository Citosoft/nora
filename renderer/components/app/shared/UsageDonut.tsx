import { cn } from "@/lib/utils";
import type { UsageDonutProps, UsageRing, UsageTone } from "@/components/app/types/toolUsage.types";

const TONE_CLASS: Record<UsageTone, string> = {
  normal: "text-primary",
  warning: "text-amber-500",
  critical: "text-destructive"
};

const STROKE_WIDTH = 3;

function Ring({ radius, ring }: { radius: number; ring: UsageRing | null }) {
  return <>
    <circle cx="12" cy="12" r={radius} fill="none" strokeWidth={STROKE_WIDTH} className="stroke-muted-foreground/20" />
    {ring && ring.percentUsed > 0 && <circle cx="12" cy="12" r={radius} fill="none" strokeWidth={STROKE_WIDTH} pathLength={100}
      strokeDasharray={`${Math.min(ring.percentUsed, 100)} 100`} strokeLinecap={ring.percentUsed >= 100 ? "butt" : "round"}
      className={cn("stroke-current transition-[stroke-dasharray] duration-500 motion-reduce:transition-none", TONE_CLASS[ring.tone])} />}
  </>;
}

/** Two concentric usage rings: the weekly window outside, the ~5-hour session window inside. */
export function UsageDonut({ rings, className }: UsageDonutProps) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-5 -rotate-90", className)}>
    <Ring radius={10.5} ring={rings.weekly} />
    <Ring radius={5.5} ring={rings.session} />
  </svg>;
}
