import type { ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import type { ToolHistorySummary } from "@shared/types/conversation/turnActivity.types";

export function summarizeToolHistory(items: readonly ToolActivity[]): ToolHistorySummary {
  let current: ToolActivity | undefined;
  for (const item of items) if (item.state === "running") current = item;
  const failedCount = items.filter((item) => item.state === "failed").length;
  const outcomes: readonly ToolState[] = ["failed", "unconfirmed", "interrupted", "declined"];
  const state = current ? "running" : outcomes.find((outcome) => items.some((item) => item.state === outcome)) ?? "completed";
  return { label: current?.label ?? `${items.length} tool ${items.length === 1 ? "call" : "calls"}`, state, count: items.length, failedCount };
}
