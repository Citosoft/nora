import type { ToolUsageInfo, ToolUsagePeriod } from "@shared/appTypes";
import type { UsageRing, UsageRings, UsageTone } from "@/components/app/types/toolUsage.types";

const WARNING_PERCENT_USED = 75;
const CRITICAL_PERCENT_USED = 90;

export function usageTone(percentUsed: number): UsageTone {
  if (percentUsed >= CRITICAL_PERCENT_USED) return "critical";
  return percentUsed >= WARNING_PERCENT_USED ? "warning" : "normal";
}

/** Main orders primary windows first, so the first weekly window is the all-models cap, not a model-scoped one. */
const selectRing = (info: ToolUsageInfo | null, period: ToolUsagePeriod): UsageRing | null => {
  const window = info?.windows.find((entry) => entry.period === period);
  if (!window) return null;
  const percentUsed = 100 - window.percentLeft;
  return { window, percentUsed, tone: usageTone(percentUsed) };
};

export function selectUsageRings(info: ToolUsageInfo | null): UsageRings {
  return { session: selectRing(info, "session"), weekly: selectRing(info, "weekly") };
}

export function hasUsageRings(rings: UsageRings): boolean {
  return !!rings.session || !!rings.weekly;
}

/** Accessible one-line summary for the donut trigger, weekly first to match the outer ring. */
export function describeUsageRings(rings: UsageRings): string {
  const parts = [rings.weekly, rings.session]
    .filter((ring): ring is UsageRing => !!ring)
    .map((ring) => `${ring.window.label} ${ring.percentUsed}% used`);
  return parts.length ? parts.join(", ") : "Usage limits unavailable";
}
