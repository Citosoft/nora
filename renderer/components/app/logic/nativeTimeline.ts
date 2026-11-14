import type { ConversationRun, TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";
import type { NativeTimelineEntry, NativeTimelineRow } from "@/components/app/types/nativeActivity.types";
import { askBotCall } from "./askBotCalls";
import { nativeTurnActivity } from "./nativeTurnActivity";

/**
 * Keep one stable tool activity row per turn and merge back-to-back reasoning into one row,
 * leaving messages and other timeline items in order. Tool calls after a turn's first are
 * folded into its activity row, so reasoning separated only by tool calls still merges.
 * Reasoning with no visible text (e.g. redacted or not yet streamed) is skipped so no empty block shows.
 */
export function groupNativeTimelineEntries(items: readonly TimelineItem[]): NativeTimelineEntry[] {
  const entries: NativeTimelineEntry[] = [];
  const toolGroups = new Map<string, ToolActivity[]>();
  for (const item of items) {
    const ask = item.kind === "tool" ? askBotCall(item) : null;
    if (ask) { entries.push({ kind: "ask", call: ask }); continue; }
    if (item.kind === "tool") {
      const group = toolGroups.get(item.runId);
      if (group) { group.push(item); continue; }
      const tools = [item];
      toolGroups.set(item.runId, tools);
      entries.push({ kind: "tools", runId: item.runId, items: tools });
      continue;
    }
    if (item.kind === "reasoning" && !item.text.trim()) continue;
    const previous = entries.at(-1);
    if (item.kind === "reasoning" && previous?.kind === "reasoning" && previous.runId === item.runId) { previous.items.push(item); continue; }
    entries.push(item.kind === "reasoning" ? { kind: "reasoning", runId: item.runId, items: [item] } : { kind: "item", item });
  }
  return entries;
}

function entryRunId(entry: NativeTimelineEntry): string {
  return entry.kind === "item" ? entry.item.runId : entry.kind === "ask" ? entry.call.tool.runId : entry.runId;
}

function entryKey(entry: NativeTimelineEntry): string {
  switch (entry.kind) {
    case "tools": return `tools:${entry.runId}`;
    case "reasoning": return `reasoning:${entry.items[0].id}`;
    case "item": return entry.item.id;
    case "ask": return `ask:${entry.call.tool.id}`;
  }
}

export function buildNativeTimeline(items: readonly TimelineItem[], runs: readonly ConversationRun[]): NativeTimelineRow[] {
  const entries = groupNativeTimelineEntries(items);
  const lastEntries = new Map<string, number>();
  const starts = new Map<string, string>();
  const turns = new Map(runs.map((run) => [run.id, run]));
  const latestItems = new Map<string, TimelineItem>();
  for (const item of items) {
    if (item.kind === "message" && item.role === "user" && !starts.has(item.runId)) starts.set(item.runId, item.createdAt);
    latestItems.set(item.runId, item);
  }
  entries.forEach((entry, index) => lastEntries.set(entryRunId(entry), index));
  return entries.map((entry, index) => {
    const runId = entryRunId(entry);
    const run = turns.get(runId);
    const startedAt = run?.startedAt ?? starts.get(runId);
    const last = lastEntries.get(runId) === index && run;
    return { key: entryKey(entry), entry, timing: last && startedAt ? { run, startedAt } : null,
      activity: last ? nativeTurnActivity(run, latestItems.get(runId) ?? null) : null };
  });
}
