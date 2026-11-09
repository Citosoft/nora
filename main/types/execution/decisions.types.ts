import type { ExecutionEffect } from "@main/types/execution/store.types";
import type { EventPayload, RuntimeRequest, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationState } from "./store.types";

export interface Decision {
  events: EventPayload[];
  effects: ExecutionEffect[];
}
export interface DecisionContext {
  now: string;
  environmentId: string;
  state: ConversationState | null;
  writers: string[];
  previousItem?: TimelineItem | null;
  previousRequest?: RuntimeRequest | null;
  effects: ExecutionEffect[];
}
