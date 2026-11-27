import type { BackgroundTask, Conversation, ConversationEvent, ConversationRun, RuntimeRequest, TimelineItem } from "./contracts.types";

export interface ConversationHeader {
  schemaVersion: 1;
  cursor: number;
  conversation: Conversation;
  activeRuns: ConversationRun[];
  queuedRuns: ConversationRun[];
  pendingRequests: RuntimeRequest[];
  /** Live background work still running between turns; empty when none. */
  backgroundTasks: BackgroundTask[];
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

/** A tool's output image, re-encoded and bounded for display. */
export interface ToolImagePreview { dataUrl: string; width: number; height: number; }
/** Thumbnails fill a grid tile; previews are readable full-width. */
export type OutputFileSize = "thumbnail" | "preview";
/** How an output file can be shown; `unsupported` files open only with the operating system. */
export type OutputFileContent = { kind: "image"; preview: ToolImagePreview } | { kind: "text"; text: string } | { kind: "unsupported" };
/** One thread's output-bearing items, trimmed for output derivation. */
export interface OutputThread { conversationId: string; title: string; workspacePath: string; updatedAt: string; archived: boolean; items: TimelineItem[]; }
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
