import type { NativeConversationView } from "@/components/app/types/nativeConversation.types";
import type { ConversationEvent, TimelineItem } from "@shared/types/conversation/contracts.types";
import { mergeRunHistory } from "./nativeRunHistory";

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
      view = { ...view, runHistory: { ...view.runHistory, runs: mergeRunHistory(view.runHistory.runs, [run]) } };
      header.activeRuns = header.activeRuns.filter((entry) => entry.id !== run.id);
      header.queuedRuns = header.queuedRuns.filter((entry) => entry.id !== run.id);
      if (run.state === "queued") header.queuedRuns.push(run);
      else if (!["completed", "failed", "interrupted"].includes(run.state)) header.activeRuns.push(run);
      break;
    }
    case "remove-run":
      header.queuedRuns = header.queuedRuns.filter((entry) => entry.id !== payload.runId);
      view = { ...view, runHistory: { ...view.runHistory, runs: view.runHistory.runs.filter((entry) => entry.id !== payload.runId) } };
      break;
    case "request": {
      const request = payload.request;
      if (request.status !== "pending" && request.status !== "responding") {
        header.pendingRequests = header.pendingRequests.filter((entry) => entry.id !== request.id);
      } else if (header.pendingRequests.some((entry) => entry.id === request.id)) {
        // Keep the visible request in place until its response has been delivered.
        header.pendingRequests = header.pendingRequests.map((entry) => entry.id === request.id ? request : entry);
      } else {
        header.pendingRequests = [...header.pendingRequests, request];
      }
      break;
    }
  }
  return { ...view, header };
}
