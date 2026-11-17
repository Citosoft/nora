import assert from "node:assert/strict";
import test from "node:test";
import { countActiveWork } from "@main/helpers/desktop-lifecycle/activeWork";
import { describeQuitPrompt, createQuitConfirmation } from "@main/helpers/desktop-lifecycle/quitConfirmation";
import type { ActiveWorkInput } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

test("queued and waiting conversations count once, busy terminal agents count separately", () => {
  const input: ActiveWorkInput = { conversations: [
    { latestRun: null, queuedCount: 2, pendingRequestCount: 1 },
    { latestRun: null, queuedCount: 0, pendingRequestCount: 1 },
    { latestRun: null, queuedCount: 0, pendingRequestCount: 0 }
  ], agents: [{ isBusy: true }, { isBusy: false }] };
  assert.deepEqual(countActiveWork(input), { conversations: 2, agents: 1, total: 3 });
});
test("idle quit skips the dialog; update warning names interrupted tasks", async () => {
  const idle = { conversations: 0, agents: 0, total: 0 };
  assert.equal(describeQuitPrompt("quit", idle), null);
  assert.equal(await createQuitConfirmation({ countActiveWork: () => idle, showPrompt: async () => { assert.fail("No idle prompt"); }, log: assert.fail })("quit"), true);
  const prompt = describeQuitPrompt("update", { conversations: 2, agents: 1, total: 3 });
  assert.match(prompt?.detail ?? "", /3 tasks are still running/);
  assert.equal(prompt?.confirmLabel, "Restart to Update");
});

test("non-terminal native runs count, terminal runs count only if queued or waiting", () => {
  const run = { id: "r", conversationId: "c", instruction: "work", state: "running" as const, attemptId: "a", nativeTurnId: null,
    createdAt: "2026-11-16T00:00:00Z", updatedAt: "2026-11-16T00:00:00Z", failure: null, usage: null, review: "pending" as const };
  const summaries: ActiveWorkInput["conversations"] = (["running", "completed", "failed", "interrupted", "awaiting-input", "recovering"] as const).map((state) => ({
    latestRun: { ...run, state }, queuedCount: 0, pendingRequestCount: 0
  }));
  assert.equal(countActiveWork({ conversations: summaries, agents: [] }).total, 3);
});
