import type { ConversationBridge } from "@shared/ipc/types/conversationGateway.types";
import type { PersonalizationBridge } from "@shared/ipc/types/personalizationGateway.types";
import type { AttentionBridge } from "@shared/ipc/types/attentionGateway.types";

export const nativeAttentionClient: AttentionBridge = {
  onOpenThread: (listener) => window.nora.attention.onOpenThread(listener)
};

export const nativeConversationBridge: ConversationBridge = {
  mcp: (input) => window.nora.conversations.mcp(input),
  account: (input) => window.nora.conversations.account(input),
  skills: (input) => window.nora.conversations.skills(input),
  execute: (input) => window.nora.conversations.execute(input),
  read: (input) => window.nora.conversations.read(input),
  watch: (input) => window.nora.conversations.watch(input),
  unwatch: (input) => window.nora.conversations.unwatch(input),
  onCursor: (listener) => window.nora.conversations.onCursor(listener)
};
export const nativePersonalizationClient: PersonalizationBridge = {
  request: (input) => window.nora.personalization.request(input),
  onChanged: (listener) => window.nora.personalization.onChanged(listener)
};
