import type { z } from "zod";
import type {
  conversationSourceSchema, commandReceiptSchema, conversationCommandSchema, conversationEventSchema, conversationSchema,
  eventPayloadSchema, failureSchema, providerBindingSchema, requestResponseSchema, requestSchema,
  runSchema, snapshotSchema, timelineItemSchema, usageSchema, workspaceRefSchema
} from "@shared/conversations/contracts";

export type ProviderBinding = z.infer<typeof providerBindingSchema>;
export type WorkspaceRef = z.infer<typeof workspaceRefSchema>;
export type ExecutionFailure = z.infer<typeof failureSchema>;
export type ExecutionUsage = z.infer<typeof usageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationRun = z.infer<typeof runSchema>;
export type TimelineItem = z.infer<typeof timelineItemSchema>;
export type RuntimeRequest = z.infer<typeof requestSchema>;
export type RequestResponse = z.infer<typeof requestResponseSchema>;
export type ConversationSnapshot = z.infer<typeof snapshotSchema>;
export type ConversationCommand = z.infer<typeof conversationCommandSchema>;
export type CommandReceipt = z.infer<typeof commandReceiptSchema>;
export type EventPayload = z.infer<typeof eventPayloadSchema>;
export type ConversationEvent = z.infer<typeof conversationEventSchema>;

export type ConversationSource = z.infer<typeof conversationSourceSchema>;
