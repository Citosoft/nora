import type { ProviderConnectionKind } from "@shared/types/provider/account.types";
import type { BotSnapshot, DirectDescriptor, GroupDescriptor } from "@shared/types/bots/bots.types";
import type { ExecutionEffect } from "@main/types/execution/store.types";
import type { EventPayload, RuntimeRequest, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationState, StoreReader } from "./store.types";
import type { PreparedProviderTransition } from "./providerTransition.types";

export interface UndoTarget {
  /** The turn's review item, which carries its observed changes and undo state. */
  review: TimelineItem | null;
  /** The turn kept an uninterrupted before/after snapshot pair. */
  restorable: boolean;
  /** Turn evidence, an undo or another thread's running turn holds an overlapping checkout. */
  busy: boolean;
}
export interface Decision {
  events: EventPayload[];
  effects: ExecutionEffect[];
}
export interface DecisionContext {
  providerConnection?: ProviderConnectionKind;
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
  admission: Pick<StoreReader, "writers" | "unfinishedEffects" | "execution" | "header">;
  previousItem?: TimelineItem | null;
  /** Store facts an undo-turn command is checked against. */
  undoTarget?: UndoTarget;
  /** The message a set-message-pin command pins, looked up from the store. */
  pinTarget?: TimelineItem | null;
  previousRequest?: RuntimeRequest | null;
}
