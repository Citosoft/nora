import assert from "node:assert/strict";
import test from "node:test";
import { canDiscardBuild, discardBuild } from "@/components/app/logic/apps/discardBuild";
import { threadSummary, threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { ConversationRun } from "@shared/types/conversation/contracts.types";
import type { AppBuildCleanupStore } from "@/components/app/types/appBuildCleanup.types";

function fixture() {
  const f = threadWorkspaceFixture();
  const summary = threadSummary("builder");
  summary.conversation.source = { kind: "app", appId: null };
  summary.conversation.queuePaused = true;
  const run: ConversationRun = { id: "queued", conversationId: "builder", instruction: "Build dashboard", state: "queued",
    attemptId: "attempt", nativeTurnId: null, createdAt: summary.conversation.createdAt, updatedAt: summary.conversation.updatedAt,
    failure: null, usage: null, review: "pending" };
  const header: ConversationHeader = { schemaVersion: 1, cursor: 1, conversation: summary.conversation,
    activeRuns: [], queuedRuns: [run, { ...run, id: "second" }], pendingRequests: [], backgroundTasks: [] };
  const actions: string[] = [];
  const store: AppBuildCleanupStore = { client: { ...f.deps.client, header: async () => header,
    execute: async (command) => { actions.push(command.kind); return f.deps.client.execute(command); } },
    setSettled: async (target, settled) => { assert.deepEqual(target, { kind: "thread", conversationId: "builder" }); assert.equal(settled, true); actions.push("settle"); },
    refresh: async () => {} };
  return { summary, run, header, store, actions };
}

test("discard clears all paused instructions before settling the builder", async () => {
  const f = fixture();
  await discardBuild(f.store, "builder");
  assert.deepEqual(f.actions, ["remove-queued", "remove-queued", "settle"]);
});

test("abandoned builds with no queue can be discarded", async () => {
  const f = fixture(); f.header.queuedRuns = []; f.header.conversation.queuePaused = false;
  await discardBuild(f.store, "builder");
  assert.deepEqual(f.actions, ["settle"]);
});

test("discard rechecks live state and refuses running work, unpaused queues and ordinary threads", async () => {
  for (const mode of ["active", "unpaused", "ordinary"] as const) {
    const f = fixture();
    if (mode === "active") f.header.activeRuns = [{ ...f.run, state: "running" }];
    if (mode === "unpaused") f.header.conversation.queuePaused = false;
    if (mode === "ordinary") delete f.header.conversation.source;
    await assert.rejects(discardBuild(f.store, "builder"));
    assert.deepEqual(f.actions, []);
  }
});

test("a failed queue removal does not hide the builder", async () => {
  const f = fixture();
  f.store.client.execute = async () => { throw new Error("Remove failed"); };
  await assert.rejects(discardBuild(f.store, "builder"), /Remove failed/);
  assert.deepEqual(f.actions, []);
});

test("cleanup availability includes paused and idle builds but excludes executing and recovering runs", () => {
  const f = fixture();
  assert.equal(canDiscardBuild(f.summary), true);
  f.summary.queuedCount = 1;
  assert.equal(canDiscardBuild(f.summary), true);
  f.summary.conversation.queuePaused = false;
  assert.equal(canDiscardBuild(f.summary), false);
  f.summary.conversation.queuePaused = true;
  for (const state of ["running", "starting", "stopping", "recovering", "awaiting-input", "awaiting-approval"] as const) {
    f.summary.latestRun = { ...f.run, state };
    assert.equal(canDiscardBuild(f.summary), false);
  }
  f.summary.latestRun = null; f.summary.pendingRequestCount = 1;
  assert.equal(canDiscardBuild(f.summary), false);
});
