import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { ExecutionStore } from "./store.types";

export interface EngineDependencies {
  store: ExecutionStore;
  now: () => string;
  nextId: () => string;
  assertOwnership: () => void;
}
export interface EventSubscription {
  after: number;
  conversationId?: string;
  onEvent: (event: ConversationEvent) => void;
  onError: (error: Error) => void;
}
export interface ActiveSubscription extends EventSubscription {
  cursor: number;
  draining: boolean;
}
