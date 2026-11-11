import type { ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { NativeTimelineRow } from "@/components/app/types/nativeActivity.types";
import { groupNativeToolHistory } from "./nativeToolHistory";

export function buildNativeTimeline(items: readonly TimelineItem[], runs: readonly ConversationRun[]): NativeTimelineRow[] {
  const entries = groupNativeToolHistory(items);
  const lastEntries = new Map<string, number>();
  const starts = new Map<string, string>();
  const turns = new Map(runs.map((run) => [run.id, run]));
  for (const item of items) if (item.kind === "message" && item.role === "user" && !starts.has(item.runId)) starts.set(item.runId, item.createdAt);
  entries.forEach((entry, index) => lastEntries.set(entry.kind === "tools" ? entry.runId : entry.item.runId, index));
  return entries.map((entry, index) => {
    const runId = entry.kind === "tools" ? entry.runId : entry.item.runId;
    const run = turns.get(runId);
    const startedAt = run?.startedAt ?? starts.get(runId);
    return { key: entry.kind === "tools" ? `tools:${runId}` : entry.item.id, entry,
      timing: lastEntries.get(runId) === index && run && startedAt ? { run, startedAt } : null };
  });
}
