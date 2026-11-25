import type { ConversationRun, TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";
import type { NativeTimelineEntry, NativeTimelineRow } from "@/components/app/types/nativeActivity.types";
import { askBotCall } from "./askBotCalls";
import { rememberCall } from "./rememberCalls";
import { mcpAppToolCall } from "./mcp-app/toolCall";
import { toolOutputImages } from "./thread-workspace/outputs";
import { turnActivity } from "@shared/conversations/turnActivity";

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
    if (item.kind === "review" && item.result.status === "unavailable" && item.result.reason === "unsupported") continue;
    if (item.kind === "tool") {
      const ask = askBotCall(item);
      if (ask) { entries.push({ kind: "ask", call: ask }); continue; }
      const memory = rememberCall(item);
      if (memory) { entries.push({ kind: "memory", call: memory }); continue; }
      const group = toolGroups.get(item.runId);
      if (group) group.push(item);
      else {
        const tools = [item];
        toolGroups.set(item.runId, tools);
        entries.push({ kind: "tools", runId: item.runId, items: tools });
      }
      const app = mcpAppToolCall(item);
      if (app) entries.push({ kind: "app", call: app });
      const images = toolOutputImages(item);
      if (images.length) entries.push({ kind: "images", tool: item, paths: images });
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
  return entry.kind === "item" ? entry.item.runId : entry.kind === "ask" || entry.kind === "memory" || entry.kind === "app" ? entry.call.tool.runId
    : entry.kind === "images" ? entry.tool.runId : entry.runId;
}

function agentMessageRunId(entry: NativeTimelineEntry | undefined): string | null {
  return entry?.kind === "item" && entry.item.kind === "message" && entry.item.role !== "user" ? entry.item.runId : null;
}

/** True when an agent message is followed directly by another agent message from the same turn. */
function continuesIntoNextMessage(entry: NativeTimelineEntry, next: NativeTimelineEntry | undefined): boolean {
  const runId = agentMessageRunId(entry);
  return runId !== null && agentMessageRunId(next) === runId;
}

function entryKey(entry: NativeTimelineEntry): string {
  switch (entry.kind) {
    case "tools": return `tools:${entry.runId}`;
    case "reasoning": return `reasoning:${entry.items[0].id}`;
    case "item": return entry.item.id;
    case "ask": return `ask:${entry.call.tool.id}`;
    case "memory": return `memory:${entry.call.tool.id}`;
    case "app": return `app:${entry.call.tool.id}`;
    case "images": return `images:${entry.tool.id}`;
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
      activity: last ? turnActivity(run, latestItems.get(runId) ?? null) : null,
      continued: continuesIntoNextMessage(entry, entries[index + 1]) };
  });
}
