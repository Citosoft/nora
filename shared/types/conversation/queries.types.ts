import type { Conversation, ConversationEvent, ConversationRun, RuntimeRequest, TimelineItem } from "./contracts.types";

export interface ConversationHeader {
  schemaVersion: 1;
  cursor: number;
  conversation: Conversation;
  activeRuns: ConversationRun[];
  queuedRuns: ConversationRun[];
  pendingRequests: RuntimeRequest[];
}
/** Stable insertion positions, independent of mutable item text and timestamps. */
export interface HistoryQuery {
  conversationId: string;
  before?: number;
  limit?: number;
  scope: "timeline" | "runs";
}
export type ConversationHistoryPage = {
  schemaVersion: 1;
  conversationId: string;
  cursor: number;
  nextBefore: number | null;
} & ({ scope: "timeline"; items: TimelineItem[] } | { scope: "runs"; runs: ConversationRun[] });

export interface ConversationSummary {
  conversation: Conversation;
  latestRun: Pick<ConversationRun, "id" | "state" | "createdAt" | "updatedAt" | "failure"> | null;
  queuedCount: number;
  pendingRequestCount: number;
}
export interface ConversationEventPage {
  schemaVersion: 1;
  after: number;
  nextCursor: number;
  events: ConversationEvent[];
}
export interface HostShutdownResult {
  unconfirmedRuns: ExecutionRef[];
}
export interface ExecutionRef {
  environmentId: string;
  conversationId: string;
  runId: string;
  attemptId: string;
}
