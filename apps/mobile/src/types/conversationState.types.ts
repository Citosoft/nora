import type { ConversationRun, RuntimeRequest, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { RemoteTask } from "@shared/types/remote-access/runtimeApi.types";

/** What a conversation is doing, as shown in lists and headers. */
export type ExecutionStateKind = "working" | "needs-approval" | "needs-input" | "queued" | "failed" | "stopped" | "done" | "idle";
export type StatusTone = "neutral" | "active" | "attention" | "danger" | "success";

export interface ExecutionState {
  kind: ExecutionStateKind;
  label: string;
  tone: StatusTone;
}

export type RunSnapshot = Pick<ConversationRun, "id" | "state" | "createdAt" | "updatedAt" | "failure">;

/** One run in the activity list, from `GET /v1/tasks` or a conversation summary's latest run. */
export interface ActivityEntry {
  conversationId: string;
  conversationTitle: string;
  projectId: string;
  run: RunSnapshot;
  label: string | null;
  pendingRequestCount: number;
  active: boolean;
}

export interface ActivityList {
  active: ActivityEntry[];
  recent: ActivityEntry[];
}

/** A pending request with the conversation it belongs to, for the cross-conversation approvals list. */
export interface InboxRequest {
  conversationId: string;
  conversationTitle: string;
  request: RuntimeRequest;
}

/** Timeline entries ready to render: subagent activity is nested under its subagent instead of interleaved. */
export type TimelineEntry =
  | { kind: "item"; item: Exclude<TimelineItem, { kind: "subagent" }> }
  | { kind: "subagent"; item: Extract<TimelineItem, { kind: "subagent" }>; children: Extract<TimelineItem, { kind: "tool" }>[] };

export type ActivitySource = { tasks: readonly RemoteTask[]; summaries: readonly ConversationSummary[] };

export type TimelineItemOf<K extends TimelineItem["kind"]> = Extract<TimelineItem, { kind: K }>;

export interface ChatsOverview {
  /** Approvals and questions waiting across the listed conversations. */
  pendingRequests: number;
  /** Conversations whose agent is working right now. */
  working: number;
}
