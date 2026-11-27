import assert from "node:assert/strict";
import test from "node:test";
import { conversationOrigin, createRunAnalytics } from "@main/helpers/analytics/runAnalytics";
import type { AnalyticsEvent } from "@shared/types/analytics.types";
import type { ConversationEvent, ConversationRun } from "@shared/types/conversation/contracts.types";

const at = "2026-11-27T10:00:00.000Z";
let cursor = 0;
const event = (payload: ConversationEvent["payload"]): ConversationEvent =>
  ({ schemaVersion: 1, id: `e${++cursor}`, conversationId: "c1", cursor, at, payload });

function run(state: ConversationRun["state"], extra: Partial<ConversationRun> = {}): ConversationRun {
  return {
    id: "r1", conversationId: "c1", instruction: "Refactor the Acme billing module", state, attemptId: "a1", nativeTurnId: null,
    createdAt: at, updatedAt: "2026-11-27T10:00:42.000Z", startedAt: "2026-11-27T10:00:02.000Z", failure: null, usage: null, review: "pending",
    provider: { kind: "claude", instanceId: "claude", model: "claude-opus-4-5", reasoning: "high", permissionPolicy: "default", connection: "subscription" },
    ...extra
  };
}

test("a run reports one start and one finish with counts and usage, never its instruction", () => {
  const events: AnalyticsEvent[] = [];
  const analytics = createRunAnalytics({ record: (next) => events.push(next), conversation: () => null });
  analytics.onEvent(event({ kind: "run", run: run("starting") }));
  analytics.onEvent(event({ kind: "run", run: run("running") }));
  analytics.onEvent(event({ kind: "run", run: run("running") }));
  const tool = { id: "t1", runId: "r1", createdAt: at, kind: "tool", label: "Read file", output: "secret contents", state: "running" } as const;
  analytics.onEvent(event({ kind: "item", item: tool }));
  analytics.onEvent(event({ kind: "item", item: { ...tool, state: "failed" } }));
  analytics.onEvent(event({ kind: "item", item: { ...tool, id: "t2", state: "completed" } }));
  analytics.onEvent(event({ kind: "request", request: {
    id: "q1", runId: "r1", attemptId: "a1", nativeId: "n1", status: "pending", createdAt: at, expiresAt: at, title: "Which?", kind: "question",
    questions: [{ id: "x", text: "Which?", options: ["a"], multiple: false }]
  } }));
  analytics.onEvent(event({ kind: "run", run: run("completed", { usage: { inputTokens: 1200, cachedInputTokens: 800, outputTokens: 300 } }) }));
  analytics.onEvent(event({ kind: "run", run: run("completed") }));

  const provider = { provider: "claude", model: "claude-opus-4-5", effort: "high", connection: "subscription", origin: "unknown", action: "turn" };
  assert.deepEqual(events.slice(0, 2), [
    { name: "turn.started", properties: provider },
    { name: "turn.finished", properties: { ...provider, outcome: "completed", durationMs: 40_000, failureCode: null, retryable: null,
      inputTokens: 1200, cachedInputTokens: 800, outputTokens: 300, toolCalls: 2, toolFailures: 1, subagents: 0, questions: 1, approvals: 0 } }
  ]);
  // A repeated terminal update is reported as its own short run rather than double-counting the first.
  assert.deepEqual(events.slice(2).map((next) => next.name), ["turn.started", "turn.finished"]);
  assert.ok(!JSON.stringify(events).includes("Acme"));
  assert.ok(!JSON.stringify(events).includes("secret contents"));
});

test("failed runs report the failure code and an error event whose message the recorder may drop", () => {
  const events: AnalyticsEvent[] = [];
  const analytics = createRunAnalytics({ record: (next) => events.push(next), conversation: () => null });
  analytics.onEvent(event({ kind: "run", run: run("failed", { failure: { code: "usage-limit", message: "Limit reached", retryable: true } }) }));
  assert.deepEqual(events.map((next) => next.name), ["turn.started", "turn.finished", "error.occurred"]);
  const finished = events[1];
  assert.equal(finished?.name === "turn.finished" && finished.properties.failureCode, "usage-limit");
  const error = events[2];
  assert.equal(error?.name === "error.occurred" && error.properties.errorCode, "usage-limit");
});

test("removed runs are forgotten and only brand-new conversations count as created threads", () => {
  const events: AnalyticsEvent[] = [];
  const analytics = createRunAnalytics({ record: (next) => events.push(next), conversation: () => null });
  analytics.onEvent(event({ kind: "run", run: run("queued") }));
  analytics.onEvent(event({ kind: "remove-run", runId: "r1" }));
  assert.deepEqual(events, []);
  assert.equal(conversationOrigin(null), "unknown");
});
