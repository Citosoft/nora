import type { Conversation, ConversationEvent, ConversationRun, EventPayload, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ConversationDetailResponse } from "@shared/types/remote-access/runtimeApi.types";

export const at = "2026-11-16T10:00:00.000Z";

export function conversation(id = "conv-1", title = "Plan the launch"): Conversation {
  return {
    id, title, parentId: null, nativeConversationId: null, archivedAt: null, createdAt: at, updatedAt: at, queuePaused: false,
    workspace: { projectId: "proj-1", environmentId: "env-1", checkoutId: "chk-1", path: "/work", branch: "main", access: "write" },
    provider: { kind: "claude", instanceId: "claude-1", model: "claude-opus", reasoning: null, permissionPolicy: "ask" }
  };
}

export function run(id: string, state: ConversationRun["state"], conversationId = "conv-1"): ConversationRun {
  return { id, conversationId, instruction: "Do the thing", state, attemptId: `${id}-a`, nativeTurnId: null, createdAt: at, updatedAt: at,
    failure: null, usage: null, review: "pending" };
}

export function message(id: string, text: string, runId = "run-1"): TimelineItem {
  return { id, runId, createdAt: at, kind: "message", role: "assistant", text, complete: false };
}

export function header(cursor: number, conversationId = "conv-1"): ConversationHeader {
  return { schemaVersion: 1, cursor, conversation: conversation(conversationId), activeRuns: [], queuedRuns: [], pendingRequests: [], backgroundTasks: [] };
}

export function detail(cursor: number, items: TimelineItem[] = [], nextBefore: number | null = null): ConversationDetailResponse {
  return { header: header(cursor), timeline: { schemaVersion: 1, conversationId: "conv-1", cursor, nextBefore, scope: "timeline", items } };
}

export function event(cursor: number, payload: EventPayload, conversationId = "conv-1"): ConversationEvent {
  return { schemaVersion: 1, id: `evt-${cursor}`, conversationId, cursor, at, payload };
}

export function summary(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return { conversation: conversation(), latestRun: null, queuedCount: 0, pendingRequestCount: 0, ...overrides };
}
