import type { BotSnapshot, DirectDescriptor, GroupDescriptor } from "@shared/types/bots/bots.types";
import type { ExecutionEffect } from "@main/types/execution/store.types";
import type { EventPayload, RuntimeRequest, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationState } from "./store.types";
import type { PreparedProviderTransition } from "./providerTransition.types";

export interface Decision {
  events: EventPayload[];
  effects: ExecutionEffect[];
}
export interface DecisionContext {
  /** Host-resolved bot for a create command that names one. */
  bot?: BotSnapshot;
  /** Host-resolved members for a create command that starts a group chat. */
  group?: GroupDescriptor;
  /** Host-resolved bot for a create command that starts a direct chat. */
  direct?: DirectDescriptor;
  providerTransition?: PreparedProviderTransition;
  steerFollowUp?: boolean;
  now: string;
  environmentId: string;
  state: ConversationState | null;
  writers: string[];
  previousItem?: TimelineItem | null;
  previousRequest?: RuntimeRequest | null;
  effects: ExecutionEffect[];
}
