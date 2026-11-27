import assert from "node:assert/strict";
import test from "node:test";
import { countActiveWork } from "@main/helpers/desktop-lifecycle/activeWork";
import { describeQuitPrompt, createQuitConfirmation } from "@main/helpers/desktop-lifecycle/quitConfirmation";
import type { ActiveWorkInput } from "@main/types/desktop-lifecycle/desktopLifecycle.types";
import type { BotSnapshot } from "@shared/types/bots/bots.types";

const provider = { kind: "claude" as const };
const conversation = { id: "c1", title: "Review changes", workspace: { path: "/work/nora" }, provider, updatedAt: "2026-11-16T00:00:00Z" };
const agent = { id: "a1", name: "Codex", threadTitle: null, workspace: "/work/other", toolId: "codex", toolLabel: "Codex", lastEventAt: "2026-11-16T00:05:00Z" };
const claudeIdentity = { kind: "provider", toolId: "claude", label: "Claude Code", connection: "unknown" } as const;
const threadTarget = { kind: "thread", conversationId: "c1" } as const;

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
    { kind: "thread", title: "Review changes", workspace: "/work/nora", status: "Waiting for approval or input, 2 queued", phase: "waiting",
      identity: claudeIdentity, activeAt: "2026-11-16T00:00:00Z", target: threadTarget },
    { kind: "thread", title: "Review changes", workspace: "/work/nora", status: "Waiting for approval or input", phase: "waiting",
      identity: claudeIdentity, activeAt: "2026-11-16T00:00:00Z", target: threadTarget },
    { kind: "terminal-agent", title: "Codex", workspace: "/work/other", status: "Terminal agent running", phase: "running", activeAt: "2026-11-16T00:05:00Z",
      identity: { kind: "provider", toolId: "codex", label: "Codex", connection: "unknown" }, target: { kind: "terminal-agent", agentId: "a1" } }
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

test("each active thread gets the phase of its most urgent part, its bot or provider, and its latest activity", () => {
  const run = { id: "r", state: "running" as const, createdAt: "2026-11-16T00:00:00Z", updatedAt: "2026-11-16T00:00:00Z", failure: null };
  const avatar = { seed: 7 };
  const bot: BotSnapshot = { botId: "b1", revision: 1, name: "Reviewer", role: "", avatar, guidance: "Review.",
    binding: { kind: "codex", instanceId: "codex", model: "gpt-5", reasoning: null, permissionPolicy: null } };
  const work = countActiveWork({ conversations: [
    { conversation, latestRun: run, queuedCount: 1, pendingRequestCount: 0 },
    { conversation, latestRun: run, queuedCount: 0, pendingRequestCount: 1 },
    { conversation, latestRun: { ...run, state: "queued" }, queuedCount: 3, pendingRequestCount: 0 },
    { conversation: { ...conversation, bot }, latestRun: null, queuedCount: 2, pendingRequestCount: 0 }
  ], agents: [] });
  assert.deepEqual(work.items.map((item) => [item.phase, item.status]), [
    ["running", "Running, 1 queued"], ["waiting", "Running, Waiting for approval or input"], ["queued", "Queued"], ["queued", "2 queued"]
  ]);
  assert.deepEqual(work.items[3]?.identity, { kind: "bot", name: "Reviewer", avatar });
  assert.equal(work.items[0]?.activeAt, run.updatedAt);
  assert.deepEqual(countActiveWork({ conversations: [{ conversation: { ...conversation, provider: { kind: "nora" as const } }, latestRun: run,
    queuedCount: 0, pendingRequestCount: 0 }], agents: [] }).items[0]?.identity, { kind: "provider", toolId: "nora", label: "Nora", connection: "unknown" });
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
