import type { ConversationEvent } from "@shared/types/conversation/contracts.types";

/** Streaming text (`item` events) does not change list rows; runs, requests and conversation metadata do. */
export function affectsSummaries(events: readonly ConversationEvent[]): boolean {
  return events.some((event) => event.payload.kind !== "item");
}
