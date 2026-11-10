import type { NativeConversationView } from "@/components/app/types/nativeConversation.types";
import type { ConversationEvent, TimelineItem } from "@shared/types/conversation/contracts.types";

export function mergeTimeline(older: readonly TimelineItem[], newer: readonly TimelineItem[]): TimelineItem[] {
  const values = new Map(older.map((item) => [item.id, item]));
  for (const item of newer) values.set(item.id, item);
  return [...values.values()];
}

export function applyNativeEvent(view: NativeConversationView, event: ConversationEvent): NativeConversationView {
  if (event.conversationId !== view.header.conversation.id || event.cursor <= view.header.cursor) return view;
  const header = { ...view.header, cursor: event.cursor };
  const payload = event.payload;
  switch (payload.kind) {
    case "conversation": header.conversation = payload.conversation; break;
    case "item": return { ...view, header, items: mergeTimeline(view.items, [payload.item]) };
    case "run": {
      const run = payload.run;
      header.activeRuns = header.activeRuns.filter((entry) => entry.id !== run.id);
      header.queuedRuns = header.queuedRuns.filter((entry) => entry.id !== run.id);
      if (run.state === "queued") header.queuedRuns.push(run);
      else if (!["completed", "failed", "interrupted"].includes(run.state)) header.activeRuns.push(run);
      break;
    }
    case "remove-run": header.queuedRuns = header.queuedRuns.filter((entry) => entry.id !== payload.runId); break;
    case "request":
      header.pendingRequests = header.pendingRequests.filter((entry) => entry.id !== payload.request.id);
      if (payload.request.status === "pending" || payload.request.status === "responding") header.pendingRequests.push(payload.request);
      break;
  }
  return { ...view, header };
}
