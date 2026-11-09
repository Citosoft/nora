import type { ExecuteConversationRequest, ReadConversationRequest, UnwatchConversationRequest, WatchConversationRequest } from "@shared/ipc/types/conversationGateway.types";

export interface ConversationTransport {
  invoke(channel: string, payload: ExecuteConversationRequest | ReadConversationRequest | WatchConversationRequest | UnwatchConversationRequest): Promise<unknown>;
  onCursor(listener: (payload: unknown) => void): () => void;
}
