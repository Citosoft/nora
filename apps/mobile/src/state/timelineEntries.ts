import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { TimelineEntry } from "@/types/conversationState.types";

/** One stable tool history per turn, visible reasoning, and nested subagent tools. */
export function buildTimelineEntries(items: readonly TimelineItem[]): TimelineEntry[] {
  const subagentIds = new Set(items.flatMap((item) => item.kind === "subagent" ? [item.nativeId] : []));
  const children = new Map<string, Extract<TimelineItem, { kind: "tool" }>[]>();
  const entries: TimelineEntry[] = [];
  const tools = new Map<string, Extract<TimelineItem, { kind: "tool" }>[]>();
  for (const item of items) {
    const parentId = item.kind === "tool" ? item.details?.parentId : undefined;
    if (item.kind === "tool" && parentId && subagentIds.has(parentId)) {
      children.set(parentId, [...(children.get(parentId) ?? []), item]);
      continue;
    }
    if (item.kind === "tool") {
      const group = tools.get(item.runId);
      if (group) group.push(item);
      else {
        const items = [item];
        tools.set(item.runId, items);
        entries.push({ kind: "tools", runId: item.runId, items });
      }
      continue;
    }
    if (item.kind === "reasoning") {
      if (!item.text.trim()) continue;
      const previous = entries.at(-1);
      if (previous?.kind === "reasoning" && previous.runId === item.runId) previous.items.push(item);
      else entries.push({ kind: "reasoning", runId: item.runId, items: [item] });
      continue;
    }
    entries.push(item.kind === "subagent" ? { kind: "subagent", item, children: [] } : { kind: "item", item });
  }
  return entries.map((entry) => entry.kind === "subagent" ? { ...entry, children: children.get(entry.item.nativeId) ?? [] } : entry);
}

/** The text a chat shows for a message: the user's own words when the instruction wrapped them. */
export function messageText(item: Extract<TimelineItem, { kind: "message" }>): string {
  return item.chatText ?? item.text;
}

/** Group keys survive streaming updates and loading older tool history. */
export function timelineEntryKey(entry: TimelineEntry): string {
  switch (entry.kind) {
    case "tools": return `tools:${entry.runId}`;
    case "reasoning": return `reasoning:${entry.items[0]?.id}`;
    case "item":
    case "subagent": return entry.item.id;
  }
}
