import type { ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import type { NativeToolHistorySummary } from "@/components/app/types/nativeActivity.types";

export function summarizeNativeToolHistory(items: readonly ToolActivity[]): NativeToolHistorySummary {
  let current: ToolActivity | undefined;
  for (const item of items) if (item.state === "running") current = item;
  const failedCount = items.filter((item) => item.state === "failed").length;
  const outcomes: readonly ToolState[] = ["failed", "unconfirmed", "interrupted", "declined"];
  const state = current ? "running" : outcomes.find((outcome) => items.some((item) => item.state === outcome)) ?? "completed";
  return { label: current?.label ?? `${items.length} tool ${items.length === 1 ? "call" : "calls"}`, state, count: items.length, failedCount };
}
