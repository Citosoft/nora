import type { TimelineItem, ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import type { NativeTimelineEntry, NativeToolHistorySummary } from "@/components/app/types/nativeActivity.types";

/** Keep one stable activity row per turn, leaving messages and other timeline items in order. */
export function groupNativeToolHistory(items: readonly TimelineItem[]): NativeTimelineEntry[] {
  const entries: NativeTimelineEntry[] = [];
  const groups = new Map<string, ToolActivity[]>();
  for (const item of items) {
    if (item.kind !== "tool") { entries.push({ kind: "item", item }); continue; }
    const group = groups.get(item.runId);
    if (group) group.push(item);
    else {
      const tools = [item];
      groups.set(item.runId, tools);
      entries.push({ kind: "tools", runId: item.runId, items: tools });
    }
  }
  return entries;
}

export function summarizeNativeToolHistory(items: readonly ToolActivity[]): NativeToolHistorySummary {
  let current: ToolActivity | undefined;
  for (const item of items) if (item.state === "running") current = item;
  const failedCount = items.filter((item) => item.state === "failed").length;
  const outcomes: readonly ToolState[] = ["failed", "unconfirmed", "interrupted", "declined"];
  const state = current ? "running" : outcomes.find((outcome) => items.some((item) => item.state === outcome)) ?? "completed";
  return { label: current?.label ?? `${items.length} tool ${items.length === 1 ? "call" : "calls"}`, state, count: items.length, failedCount };
}
