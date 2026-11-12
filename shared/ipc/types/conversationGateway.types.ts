import type { z } from "zod";
import type { cursorHintSchema, executeRequestSchema, gatewayErrorSchema, gatewayReplySchema, readRequestSchema,
  readResultSchema, unwatchRequestSchema, watchReceiptSchema, watchRequestSchema } from "@shared/conversations/gateway";
import type { CommandReceipt } from "@shared/types/conversation/contracts.types";

export type ExecuteConversationRequest = z.infer<typeof executeRequestSchema>;
export type ReadConversationRequest = z.infer<typeof readRequestSchema>;
export type ReadConversationResult = z.infer<typeof readResultSchema>;
export type WatchConversationRequest = z.infer<typeof watchRequestSchema>;
export type UnwatchConversationRequest = z.infer<typeof unwatchRequestSchema>;
export type ConversationCursorHint = z.infer<typeof cursorHintSchema>;
export type ConversationWatchReceipt = z.infer<typeof watchReceiptSchema>;
export type ConversationGatewayError = z.infer<typeof gatewayErrorSchema>;
export type ConversationGatewayReply = z.infer<typeof gatewayReplySchema>;

import type { McpRequest, McpResult } from "@shared/types/provider/mcp.types";
import type { ProviderAccountRequest, ProviderAccountResult } from "@shared/types/provider/account.types";
import type { SkillsRequest, SkillsResult } from "@shared/types/provider/skills.types";

export interface ConversationBridge {
  mcp(request: McpRequest): Promise<McpResult>;
  account(request: ProviderAccountRequest): Promise<ProviderAccountResult>;
  skills(request: SkillsRequest): Promise<SkillsResult>;
  execute(request: ExecuteConversationRequest): Promise<CommandReceipt>;
  read(request: ReadConversationRequest): Promise<ReadConversationResult>;
  watch(request: WatchConversationRequest): Promise<ConversationWatchReceipt>;
  unwatch(request: UnwatchConversationRequest): Promise<void>;
  onCursor(listener: (hint: ConversationCursorHint) => void): () => void;
}
