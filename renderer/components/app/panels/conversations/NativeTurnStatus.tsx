import { Sparkle } from "lucide-react";
import type { NativeTurnActivityProps } from "@/components/app/types/nativeActivity.types";

/** The live line under a running turn that says what it is doing between visible steps. */
export function NativeTurnStatus({ activity }: NativeTurnActivityProps) {
  return <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
    <Sparkle className="size-3.5 shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
    <span className="min-w-0 truncate text-shimmer">{activity.label}</span>
  </p>;
}
