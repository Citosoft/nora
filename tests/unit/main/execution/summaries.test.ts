import assert from "node:assert/strict";
import test from "node:test";
import { summarizeConversation } from "@main/execution/summaries";
import { fixture } from "./fixture";

test("a paused queued instruction cannot hide the failure requiring attention", (t) => {
  const f = fixture(t); f.create(); f.submit(); f.submit("queued");
  f.update({ kind: "finished", eventId: "failure", status: "failed", usage: null,
    failure: { code: "provider", message: "Native failure", retryable: true } });
  const summary = summarizeConversation(f.snapshot());
  assert.equal(summary.latestRun?.state, "failed");
  assert.equal(summary.queuedCount, 1);
  assert.equal(summary.conversation.queuePaused, true);
});

test("meaningful activity updates recency while streamed text leaves conversation ordering stable", (t) => {
  const f = fixture(t); f.create();
  f.setTime("2026-10-21T10:01:00.000Z"); f.submit();
  assert.equal(f.snapshot().conversation.updatedAt, "2026-10-21T10:01:00.000Z");
  const run = f.snapshot().runs[0];
  f.setTime("2026-10-21T10:02:00.000Z");
  f.engine.accept({ kind: "item", eventId: "delta", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    item: { kind: "message", role: "assistant", id: "message", runId: run.id, text: "Streaming", complete: false, createdAt: "2026-10-21T10:02:00.000Z" } });
  assert.equal(f.snapshot().conversation.updatedAt, "2026-10-21T10:01:00.000Z");
  f.setTime("2026-10-21T10:03:00.000Z");
  f.engine.accept({ kind: "request", eventId: "request", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    request: { kind: "approval", id: "approval", nativeId: "native", runId: run.id, attemptId: run.attemptId, title: "Allow?", status: "pending",
      createdAt: "2026-10-21T10:03:00.000Z", expiresAt: "2026-10-21T10:05:00.000Z", options: [{ id: "allow", label: "Allow once" }] } });
  assert.equal(f.snapshot().conversation.updatedAt, "2026-10-21T10:03:00.000Z");
  assert.equal(summarizeConversation(f.snapshot()).pendingRequestCount, 1);
});
