import assert from "node:assert/strict";
import test from "node:test";
import { countActiveWork } from "@main/helpers/desktop-lifecycle/activeWork";
import { describeQuitPrompt, createQuitConfirmation } from "@main/helpers/desktop-lifecycle/quitConfirmation";
import type { ActiveWorkInput } from "@main/types/desktop-lifecycle/desktopLifecycle.types";

const conversation = { title: "Review changes", workspace: { path: "/work/nora" } };
const agent = { name: "Codex", threadTitle: null, workspace: "/work/other" };

test("queued and waiting conversations count once, busy terminal agents count separately", () => {
  const input: ActiveWorkInput = { conversations: [
    { conversation, latestRun: null, queuedCount: 2, pendingRequestCount: 1 },
    { conversation, latestRun: null, queuedCount: 0, pendingRequestCount: 1 },
    { conversation, latestRun: null, queuedCount: 0, pendingRequestCount: 0 }
  ], agents: [{ ...agent, isBusy: true }, { ...agent, isBusy: false }] };
  const work = countActiveWork(input);
  assert.equal(work.conversations, 2);
  assert.equal(work.agents, 1);
  assert.equal(work.total, 3);
  assert.deepEqual(work.items, [
    { kind: "thread", title: "Review changes", workspace: "/work/nora", status: "Waiting for approval or input, 2 queued" },
    { kind: "thread", title: "Review changes", workspace: "/work/nora", status: "Waiting for approval or input" },
    { kind: "terminal-agent", title: "Codex", workspace: "/work/other", status: "Terminal agent running" }
  ]);
});
test("idle quit skips the dialog; update warning names interrupted tasks", async () => {
  const idle = countActiveWork({ conversations: [], agents: [] });
  assert.equal(describeQuitPrompt("quit", idle), null);
  assert.equal(await createQuitConfirmation({ countActiveWork: () => idle, showPrompt: async () => { assert.fail("No idle prompt"); }, log: assert.fail })("quit"), true);
  const prompt = describeQuitPrompt("update", countActiveWork({ conversations: [
    { conversation, latestRun: null, queuedCount: 1, pendingRequestCount: 0 }
  ], agents: [] }));
  assert.match(prompt?.detail ?? "", /1 task is still active/);
  assert.match(prompt?.detail ?? "", /Review changes — 1 queued\n  \/work\/nora/);
  assert.equal(prompt?.confirmLabel, "Restart to Update");
});

test("non-terminal native runs count, terminal runs count only if queued or waiting", () => {
  const run = { id: "r", conversationId: "c", instruction: "work", state: "running" as const, attemptId: "a", nativeTurnId: null,
    createdAt: "2026-11-16T00:00:00Z", updatedAt: "2026-11-16T00:00:00Z", failure: null, usage: null, review: "pending" as const };
  const summaries: ActiveWorkInput["conversations"] = (["running", "completed", "failed", "interrupted", "awaiting-input", "recovering"] as const).map((state) => ({
    conversation, latestRun: { ...run, state }, queuedCount: 0, pendingRequestCount: 0
  }));
  assert.equal(countActiveWork({ conversations: summaries, agents: [] }).total, 3);
});

test("quit prompt distinguishes waiting runs and terminal titles without counting idle work", () => {
  const work = countActiveWork({ conversations: [
    { conversation: { ...conversation, title: "Finished thread" }, latestRun: null, queuedCount: 0, pendingRequestCount: 0 }
  ], agents: [{ ...agent, threadTitle: "Fix shutdown", isBusy: true }] });
  const prompt = describeQuitPrompt("relaunch", work);
  assert.match(prompt?.detail ?? "", /Fix shutdown — Terminal agent running/);
  assert.doesNotMatch(prompt?.detail ?? "", /Finished thread/);
  assert.equal(prompt?.confirmLabel, "Restart Nora");
});

test("quit confirmation preserves cancellation and tolerates failed work inspection", async () => {
  const work = countActiveWork({ conversations: [], agents: [{ ...agent, isBusy: true }] });
  assert.equal(await createQuitConfirmation({ countActiveWork: () => work,
    showPrompt: async () => false, log: assert.fail })("quit"), false);
  let logged = false;
  assert.equal(await createQuitConfirmation({ countActiveWork: () => { throw new Error("unavailable"); },
    showPrompt: async () => { assert.fail("No prompt on inspection failure"); }, log: () => { logged = true; } })("quit"), true);
  assert.equal(logged, true);
});
