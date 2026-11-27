import assert from "node:assert/strict";
import test from "node:test";
import { remoteEvent, remoteEventPage, remoteHeader, remoteRun } from "@main/remote-access/http/remoteRuns";
import type { ConversationRun } from "@shared/types/conversation/contracts.types";
import { conversation } from "../nora-tools/fixture";

const AT = "2026-11-25T10:00:00.000Z";
const run = (action?: ConversationRun["action"]): ConversationRun => ({ id: "run", conversationId: "conversation", instruction: "Background task finished: Build",
  ...(action ? { action } : {}), attemptId: "attempt", nativeTurnId: null, state: "running", createdAt: AT, updatedAt: AT, failure: null, usage: null, review: "pending" });

test("phones get runs without actions they cannot parse, and every other run unchanged", () => {
  assert.equal("action" in remoteRun(run("background-task")), false);
  assert.equal(remoteRun(run("compact")).action, "compact");
  const plain = run();
  assert.equal(remoteRun(plain), plain);
});

test("headers, events and event pages are all served in the phone-safe form", () => {
  const header = remoteHeader({ schemaVersion: 1, cursor: 1, conversation: conversation("conversation"), activeRuns: [run("background-task")], queuedRuns: [run("background-task")], pendingRequests: [], backgroundTasks: [] });
  assert.ok([...header.activeRuns, ...header.queuedRuns].every((entry) => !("action" in entry)));
  const event = { schemaVersion: 1 as const, id: "event", conversationId: "conversation", cursor: 1, at: AT, payload: { kind: "run" as const, run: run("background-task") } };
  const served = remoteEvent(event);
  assert.ok(served.payload.kind === "run" && !("action" in served.payload.run));
  assert.ok(remoteEventPage({ schemaVersion: 1, after: 0, nextCursor: 1, events: [event] }).events.every((entry) => entry.payload.kind !== "run" || !("action" in entry.payload.run)));
});
