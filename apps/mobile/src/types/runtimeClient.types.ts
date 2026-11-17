import type { z } from "zod";
import type { timelinePageSchema } from "@shared/conversations/gateway";
import type { CommandReceipt } from "@shared/types/conversation/contracts.types";
import type { ConversationEventPage, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ActionDecisionRequest, CancelTaskRequest, ConversationDetailResponse, CreateConversationRequest, RealtimeTicketResponse,
  RemoteProject, RemoteTask, RuntimeInfo, SendMessageRequest } from "@shared/types/remote-access/runtimeApi.types";
import type { FetchLike, TokenProvider } from "./http.types";

export type TimelinePage = z.infer<typeof timelinePageSchema>;

export interface RuntimeClientConfig {
  /** The runtime's tunnel hostname from the directory, e.g. `abc123.remote.withnora.run`. */
  hostname: string;
  getToken: TokenProvider;
  fetch: FetchLike;
  timeoutMs: number;
  commandTimeoutMs: number;
}

export interface ConversationListQuery {
  projectId?: string;
  settled?: boolean;
}
export interface TimelineQuery {
  before?: number;
  limit?: number;
}
export interface EventsQuery {
  after: number;
  conversationId?: string;
  limit?: number;
}

/** Typed client for one runtime's `/v1` API. Every call fetches a fresh Clerk token and validates the reply. */
export interface RuntimeClient {
  readonly origin: string;
  info(): Promise<RuntimeInfo>;
  projects(): Promise<RemoteProject[]>;
  conversations(query?: ConversationListQuery): Promise<ConversationSummary[]>;
  conversation(conversationId: string): Promise<ConversationDetailResponse>;
  timeline(conversationId: string, query: TimelineQuery): Promise<TimelinePage>;
  tasks(): Promise<RemoteTask[]>;
  events(query: EventsQuery): Promise<ConversationEventPage>;
  realtimeTicket(): Promise<RealtimeTicketResponse>;
  realtimeUrl(ticket: string): string;
  createConversation(request: CreateConversationRequest): Promise<CommandReceipt>;
  sendMessage(conversationId: string, request: SendMessageRequest): Promise<CommandReceipt>;
  decideAction(requestId: string, request: ActionDecisionRequest): Promise<CommandReceipt>;
  cancelTask(runId: string, request: CancelTaskRequest): Promise<CommandReceipt>;
}
