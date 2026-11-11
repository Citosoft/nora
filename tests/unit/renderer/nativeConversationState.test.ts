import assert from "node:assert/strict";
import test from "node:test";
import { applyNativeEvent } from "@/components/app/logic/nativeConversationState";
import type { NativeConversationView } from "@/components/app/types/nativeConversation.types";
import type { ApprovalRequest, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import { threadSummary } from "./threadWorkspaceFixtures";

function approval(id: string): ApprovalRequest {
  return { id, nativeId: id, runId: "run", attemptId: "attempt", kind: "approval", status: "pending", title: id,
    createdAt: "2026-11-11T10:00:00.000Z", expiresAt: "2026-11-11T11:00:00.000Z", options: [{ id: "allow", label: "Allow" }] };
}

function view(requests: RuntimeRequest[]): NativeConversationView {
  return { header: { schemaVersion: 1, cursor: 0, conversation: threadSummary().conversation,
    activeRuns: [], queuedRuns: [], pendingRequests: requests }, items: [], nextBefore: null, runHistory: { runs: [], nextBefore: null } };
}

function update(current: NativeConversationView, request: RuntimeRequest): NativeConversationView {
  return applyNativeEvent(current, { schemaVersion: 1, id: `event-${current.header.cursor + 1}`, cursor: current.header.cursor + 1,
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
