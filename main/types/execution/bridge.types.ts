import type { ExecuteConversationRequest, ReadConversationRequest, UnwatchConversationRequest, WatchConversationRequest } from "@shared/ipc/types/conversationGateway.types";

import type { McpRequest } from "@shared/types/provider/mcp.types";

export interface ConversationTransport {
  invoke(channel: string, payload: McpRequest | ExecuteConversationRequest | ReadConversationRequest | WatchConversationRequest | UnwatchConversationRequest): Promise<unknown>;
  onCursor(listener: (payload: unknown) => void): () => void;
}
