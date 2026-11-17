import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { TimelineEntry } from "@/types/conversationState.types";

/** Nests each subagent's own tool calls under it, keeping every other item in timeline order. */
export function buildTimelineEntries(items: readonly TimelineItem[]): TimelineEntry[] {
  const subagentIds = new Set(items.flatMap((item) => item.kind === "subagent" ? [item.nativeId] : []));
  const children = new Map<string, Extract<TimelineItem, { kind: "tool" }>[]>();
  const entries: TimelineEntry[] = [];
  for (const item of items) {
    const parentId = item.kind === "tool" ? item.details?.parentId : undefined;
    if (item.kind === "tool" && parentId && subagentIds.has(parentId)) {
      children.set(parentId, [...(children.get(parentId) ?? []), item]);
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
