import assert from "node:assert/strict";
import test from "node:test";
import { applyConversationEvent } from "@shared/conversations/conversationView";
import { backgroundTasksStatus } from "@shared/conversations/backgroundTasks";
import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import type { ApprovalRequest, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import { threadSummary } from "../renderer/threadWorkspaceFixtures";

function approval(id: string): ApprovalRequest {
  return { id, nativeId: id, runId: "run", attemptId: "attempt", kind: "approval", status: "pending", title: id,
    createdAt: "2026-11-11T10:00:00.000Z", expiresAt: "2026-11-11T11:00:00.000Z", options: [{ id: "allow", label: "Allow" }] };
}

function view(requests: RuntimeRequest[]): ConversationView {
  return { header: { schemaVersion: 1, cursor: 0, conversation: threadSummary().conversation,
    activeRuns: [], queuedRuns: [], pendingRequests: requests, backgroundTasks: [] }, items: [], nextBefore: null, runHistory: { runs: [], nextBefore: null } };
}

function update(current: ConversationView, request: RuntimeRequest): ConversationView {
  return applyConversationEvent(current, { schemaVersion: 1, id: `event-${current.header.cursor + 1}`, cursor: current.header.cursor + 1,
    conversationId: current.header.conversation.id, at: request.createdAt, payload: { kind: "request", request } });
}

test("request updates and arrivals keep the visible approval in place until delivery completes", () => {
  const first = approval("first");
  const initial = view([first, approval("second")]);
  const responding = update(initial, { ...first, status: "responding" });
  assert.deepEqual(responding.header.pendingRequests.map((request) => request.id), ["first", "second"]);
  assert.equal(responding.header.pendingRequests[0].status, "responding");
  assert.equal(initial.header.pendingRequests[0].status, "pending", "Do not mutate the previous view");
  const arrival = update(responding, approval("third"));
  assert.deepEqual(arrival.header.pendingRequests.map((request) => request.id), ["first", "second", "third"]);
  const delivered = update(arrival, { ...first, status: "resolved" });
  assert.deepEqual(delivered.header.pendingRequests.map((request) => request.id), ["second", "third"]);
});

test("failed delivery retries retain their position and expired requests leave the stack", () => {
  const first = approval("first");
  const initial = view([first, approval("second")]);
  const retry = update(update(initial, { ...first, status: "responding" }), first);
  assert.deepEqual(retry.header.pendingRequests, initial.header.pendingRequests);
  const expired = update(retry, { ...first, status: "expired" });
  assert.equal(expired.header.pendingRequests[0].id, "second");
  const empty = update(expired, { ...approval("second"), status: "resolved" });
  assert.deepEqual(empty.header.pendingRequests, []);
});

test("questions share the arrival order with approvals", () => {
  const { options: _options, ...base } = approval("question");
  const question: RuntimeRequest = { ...base, kind: "question", questions: [{ id: "choice", text: "Continue?", options: ["Yes", "No"], multiple: false }] };
  const initial = update(view([approval("first")]), question);
  const next = update(initial, { ...approval("first"), status: "resolved" });
  assert.deepEqual(next.header.pendingRequests, [question]);
});

test("background-tasks events replace the header list and status hides when empty", () => {
  const initial = view([]);
  assert.equal(backgroundTasksStatus(initial.header.backgroundTasks), null);
  const withTasks = applyConversationEvent(initial, {
    schemaVersion: 1, id: "bg-1", cursor: 1, conversationId: initial.header.conversation.id, at: "2026-11-11T10:00:00.000Z",
    payload: { kind: "background-tasks", tasks: [{ id: "task-1", description: "Wait for the build", kind: "local_bash" }] }
  });
  assert.deepEqual(withTasks.header.backgroundTasks, [{ id: "task-1", description: "Wait for the build", kind: "local_bash" }]);
  assert.deepEqual(backgroundTasksStatus(withTasks.header.backgroundTasks), {
    count: 1, title: "Running in background", descriptions: ["Wait for the build"]
  });
  const cleared = applyConversationEvent(withTasks, {
    schemaVersion: 1, id: "bg-2", cursor: 2, conversationId: initial.header.conversation.id, at: "2026-11-11T10:01:00.000Z",
    payload: { kind: "background-tasks", tasks: [] }
  });
  assert.deepEqual(cleared.header.backgroundTasks, []);
  assert.equal(backgroundTasksStatus(cleared.header.backgroundTasks), null);
});
