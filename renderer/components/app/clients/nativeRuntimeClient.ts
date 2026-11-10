import type { ConversationBridge } from "@shared/ipc/types/conversationGateway.types";
import type { PersonalizationBridge } from "@shared/ipc/types/personalizationGateway.types";

export const nativeConversationBridge: ConversationBridge = {
  execute: (input) => window.nora.conversations.execute(input),
  read: (input) => window.nora.conversations.read(input),
  watch: (input) => window.nora.conversations.watch(input),
  unwatch: (input) => window.nora.conversations.unwatch(input),
  onCursor: (listener) => window.nora.conversations.onCursor(listener)
};
export const nativePersonalizationClient: PersonalizationBridge = { request: (input) => window.nora.personalization.request(input) };
