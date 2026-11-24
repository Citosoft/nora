import type { providerOptionsResponseSchema } from "@shared/remote-access/runtimeApi";
import type { z } from "zod";
import type { actionDecisionRequestSchema, anonymousRuntimeInfoSchema, botsResponseSchema, cancelTaskRequestSchema, createBotChatRequestSchema, commandResponseSchema, conversationDetailResponseSchema,
  conversationsResponseSchema, createConversationRequestSchema, eventsResponseSchema, projectsResponseSchema, realtimeClientMessageSchema,
  realtimeServerMessageSchema, realtimeTicketResponseSchema, remoteBotSchema, remoteProjectSchema, remoteTaskSchema, runtimeApiErrorCodeSchema, runtimeApiErrorSchema,
  runtimeInfoSchema, sendMessageRequestSchema, tasksResponseSchema, timelineResponseSchema, RUNTIME_CAPABILITIES } from "@shared/remote-access/runtimeApi";

export type RuntimeCapability = (typeof RUNTIME_CAPABILITIES)[number];
export type AnonymousRuntimeInfo = z.infer<typeof anonymousRuntimeInfoSchema>;
export type RuntimeInfo = z.infer<typeof runtimeInfoSchema>;
export type RemoteProject = z.infer<typeof remoteProjectSchema>;
export type RemoteBot = z.infer<typeof remoteBotSchema>;
export type BotsResponse = z.infer<typeof botsResponseSchema>;
export type CreateBotChatRequest = z.infer<typeof createBotChatRequestSchema>;
export type ProjectsResponse = z.infer<typeof projectsResponseSchema>;
export type ConversationsResponse = z.infer<typeof conversationsResponseSchema>;
export type ConversationDetailResponse = z.infer<typeof conversationDetailResponseSchema>;
export type TimelineResponse = z.infer<typeof timelineResponseSchema>;
export type CreateConversationRequest = z.infer<typeof createConversationRequestSchema>;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
export type ActionDecisionRequest = z.infer<typeof actionDecisionRequestSchema>;
export type CancelTaskRequest = z.infer<typeof cancelTaskRequestSchema>;
export type CommandResponse = z.infer<typeof commandResponseSchema>;
export type RemoteTask = z.infer<typeof remoteTaskSchema>;
export type TasksResponse = z.infer<typeof tasksResponseSchema>;
export type EventsResponse = z.infer<typeof eventsResponseSchema>;
export type RealtimeTicketResponse = z.infer<typeof realtimeTicketResponseSchema>;
export type RuntimeApiErrorCode = z.infer<typeof runtimeApiErrorCodeSchema>;
export type RuntimeApiError = z.infer<typeof runtimeApiErrorSchema>;
export type RealtimeClientMessage = z.infer<typeof realtimeClientMessageSchema>;
export type RealtimeServerMessage = z.infer<typeof realtimeServerMessageSchema>;

export type ProviderOptionsResponse = z.infer<typeof providerOptionsResponseSchema>;
