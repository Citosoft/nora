import { ThinkingOrb } from "thinking-orbs";
import type { NativeTurnActivityProps } from "@/components/app/types/nativeActivity.types";
import { TURN_ACTIVITY_ORBS } from "@shared/conversations/turnActivityOrbs";

/** The live line under a running turn, driven by normalized provider activity. */
export function NativeTurnStatus({ activity }: NativeTurnActivityProps) {
  return <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
    <ThinkingOrb state={TURN_ACTIVITY_ORBS[activity.kind]} size={32} className="shrink-0" aria-hidden />
    <span className="min-w-0 truncate text-shimmer">{activity.label}</span>
  </p>;
}
