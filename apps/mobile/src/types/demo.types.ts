import type { ConversationEvent, EventPayload, CommandReceipt } from "@shared/types/conversation/contracts.types";
import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import type { RuntimeClient } from "./runtimeClient.types";
import type { KeyValueStorage } from "./storage.types";

export interface DemoMode {
  active: boolean;
  storage: KeyValueStorage;
  enter(): void;
  exit(): void;
}
export interface DemoRuntime {
  client: RuntimeClient;
  subscribe(listener: (events: readonly ConversationEvent[]) => void): () => void;
  dispose(): void;
}
export interface DemoStore {
  threads: Map<string, ConversationView>;
  events: ConversationEvent[];
  now(): string;
  emit(conversationId: string, payload: EventPayload): void;
  receipt(commandId: string, conversationId: string): CommandReceipt;
  find(conversationId: string): ConversationView;
  schedule(action: () => void, delay: number): void;
}
