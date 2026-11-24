import type { z } from "zod";
import type {
  initialInstructionSchema, chatBranchOriginSchema, chatBranchSchema, conversationSourceSchema, commandReceiptSchema, conversationCommandSchema, conversationEventSchema, conversationSchema,
  eventPayloadSchema, failureSchema, providerBindingSchema, requestResponseSchema, requestSchema,
  runSchema, runActionSchema, contextUsageSchema, snapshotSchema, pinnedMessageSchema, timelineItemSchema, usageSchema, workspaceRefSchema, toolDetailsSchema, toolStateSchema, approvalDetailsSchema
} from "@shared/conversations/contracts";

export type ProviderBinding = z.infer<typeof providerBindingSchema>;
export type WorkspaceRef = z.infer<typeof workspaceRefSchema>;
export type ChatBranch = z.infer<typeof chatBranchSchema>;
export type ChatBranchOrigin = z.infer<typeof chatBranchOriginSchema>;
export type ExecutionFailure = z.infer<typeof failureSchema>;
export type ExecutionUsage = z.infer<typeof usageSchema>;
export type ContextUsage = z.infer<typeof contextUsageSchema>;
/** A runtime's context measurement before the host stamps when it was received. */
export type ContextReading = Omit<ContextUsage, "updatedAt">;
export type RunAction = z.infer<typeof runActionSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type PinnedMessage = z.infer<typeof pinnedMessageSchema>;
export type ConversationRun = z.infer<typeof runSchema>;
export type TimelineItem = z.infer<typeof timelineItemSchema>;
export type ToolActivity = Extract<TimelineItem, { kind: "tool" }>;
export type SubagentActivity = Extract<TimelineItem, { kind: "subagent" }>;
export type ConnectorSignInItem = Extract<TimelineItem, { kind: "connector-sign-in" }>;
export type ToolDetails = z.infer<typeof toolDetailsSchema>;
export type ToolOutputFile = NonNullable<ToolDetails["outputFiles"]>[number];
export type ToolState = z.infer<typeof toolStateSchema>;
export type ApprovalDetails = z.infer<typeof approvalDetailsSchema>;
export type ApprovalRequest = Extract<RuntimeRequest, { kind: "approval" }>;
export type RuntimeRequest = z.infer<typeof requestSchema>;
export type RequestResponse = z.infer<typeof requestResponseSchema>;
export type QuestionRequest = Extract<RuntimeRequest, { kind: "question" }>;
export type RequestQuestion = QuestionRequest["questions"][number];
export type QuestionAnswers = Extract<RequestResponse, { kind: "question" }>["answers"];
export type ConversationSnapshot = z.infer<typeof snapshotSchema>;
export type ConversationCommand = z.infer<typeof conversationCommandSchema>;
export type CommandReceipt = z.infer<typeof commandReceiptSchema>;
export type EventPayload = z.infer<typeof eventPayloadSchema>;
export type ConversationEvent = z.infer<typeof conversationEventSchema>;

export type ConversationSource = z.infer<typeof conversationSourceSchema>;

export type InitialInstruction = z.infer<typeof initialInstructionSchema>;
