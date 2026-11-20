import assert from "node:assert/strict";
import test from "node:test";
import { buildChatActivity } from "@/components/app/logic/chatActivity";
import { buildChatWorkThreads } from "@/components/app/logic/chatWorkThreads";
import { threadSummary } from "./threadWorkspaceFixtures";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";

const at = (minute: number): string => `2026-11-20T10:${String(minute).padStart(2, "0")}:00.000Z`;

function task(state: NonNullable<ConversationSummary["latestRun"]>["state"]) {
  const summary = threadSummary(state);
  summary.conversation.parentId = "chat";
  summary.conversation.createdAt = at(1);
  // A later metadata edit must not change when the run's outcome is shown.
  summary.conversation.updatedAt = at(9);
  summary.latestRun = { id: "run", state, createdAt: at(1), updatedAt: at(3), failure: null };
  return buildChatWorkThreads([summary], "chat", [])[0];
}

test("chat activity includes milestones, excluding all replies, sent messages and tool chatter", () => {
  const items: TimelineItem[] = [
    { kind: "message", id: "user", runId: "r", createdAt: at(0), role: "user", text: "Wrapped input", chatText: "Start the task", complete: true },
    { kind: "message", id: "partial", runId: "r", createdAt: at(1), role: "assistant", text: "Thinking", complete: false },
    { kind: "tool", id: "tool", runId: "r", createdAt: at(2), label: "Command", output: "log", state: "completed" },
    { kind: "reasoning", id: "reason", runId: "r", createdAt: at(2), text: "Internal", complete: true },
    { kind: "milestone", id: "notice", runId: "r", createdAt: at(3), text: "Waiting for approval" },
    { kind: "message", id: "reply", runId: "r", createdAt: at(4), role: "assistant", text: "Finished", complete: true, workThreadId: "task" },
    { kind: "message", id: "direct-reply", runId: "r", createdAt: at(5), role: "assistant", text: "Hello", chatText: "Hello", complete: true }
  ];
  const events = buildChatActivity(items, []);
  assert.deepEqual(events.map((event) => [event.kind, event.createdAt]), [["notice", at(3)]]);
  assert.equal(events[0].threadId, null);
  assert.equal(buildChatActivity([items[0]], []).length, 0);
  assert.equal(buildChatActivity([items[4], items[4]], []).length, 1);
  assert.deepEqual(buildChatActivity([items[5], items[6]], []), []);
});

test("thread lifecycle events link to saved work and use the run outcome's timestamp", () => {
  const thread = task("completed");
  const events = buildChatActivity([], [thread]);
  assert.deepEqual(events.map((event) => [event.kind, event.createdAt, event.threadId]), [
    ["completed", at(3), thread.id], ["started", at(1), thread.id]
  ]);
  for (const state of ["failed", "interrupted", "awaiting-approval", "awaiting-input", "recovering"] as const) {
    const activity = buildChatActivity([], [task(state)]);
    assert.equal(activity[0].kind, state === "failed" ? "failed" : state === "interrupted" ? "interrupted" : "waiting");
  }
  assert.deepEqual(buildChatActivity([], [task("running")]).map((event) => event.kind), ["started"]);
});

test("activity previews stay compact and deterministic across history reloads", () => {
  const thread = task("failed");
  assert.ok(thread.latestRun);
  thread.latestRun.failure = { code: "provider", message: `Failure\n\n${"word ".repeat(60)}`, retryable: false };
  const first = buildChatActivity([], [thread]);
  assert.ok(first[0].detail);
  assert.ok(first[0].detail.length <= 120);
  assert.ok(!first[0].detail.includes("\n"));
  assert.deepEqual(buildChatActivity([], [thread]), first);
});
