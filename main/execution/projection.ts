import type { ConversationEvent, ConversationRun, ConversationSnapshot, EventPayload } from "@shared/types/conversation/contracts.types";
import type { ConversationState } from "@main/types/execution/store.types";

export const activeRunStates = ["starting", "running", "awaiting-approval", "awaiting-input", "stopping", "recovering"] as const;

export function isActiveRun(run: ConversationRun): boolean {
  return activeRunStates.some((state) => state === run.state);
}

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((entry) => entry.id === item.id)
    ? items.map((entry) => entry.id === item.id ? item : entry)
    : [...items, item];
}

export function projectState(snapshot: ConversationState | null, payload: EventPayload): ConversationState {
  if (payload.kind === "conversation") {
    return snapshot
      ? { ...snapshot, conversation: payload.conversation }
      : { cursor: 0, conversation: payload.conversation, runs: [], requests: [] };
  }
  if (!snapshot) throw new Error("Conversation must exist before its activity");
  switch (payload.kind) {
    case "run": return { ...snapshot, runs: upsert(snapshot.runs, payload.run) };
    case "remove-run": return { ...snapshot, runs: snapshot.runs.filter((run) => run.id !== payload.runId) };
    case "item": return snapshot;
    case "request": return { ...snapshot, requests: upsert(snapshot.requests, payload.request) };
  }
}

export function projectPayload(snapshot: ConversationSnapshot | null, payload: EventPayload): ConversationSnapshot {
  const state = projectState(snapshot, payload);
  return { ...state, schemaVersion: 1, items: payload.kind === "item"
    ? upsert(snapshot?.items ?? [], payload.item) : snapshot?.items ?? [] };
}

export function projectEvent(snapshot: ConversationSnapshot | null, event: ConversationEvent): ConversationSnapshot {
  if (snapshot && event.cursor <= snapshot.cursor) return snapshot;
  if (snapshot && snapshot.conversation.id !== event.conversationId) throw new Error("Event belongs to another conversation");
  return { ...projectPayload(snapshot, event.payload), cursor: event.cursor };
}
