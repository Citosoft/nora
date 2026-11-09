import type { ConversationGatewayError } from "@shared/ipc/types/conversationGateway.types";

export class ConversationAccessError extends Error {
  readonly code: ConversationGatewayError["code"];
  constructor(error: ConversationGatewayError) { super(error.message); this.name = "ConversationAccessError"; this.code = error.code; }
}
