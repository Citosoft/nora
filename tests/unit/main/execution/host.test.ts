import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { ExecutionHost } from "@main/execution/host";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { fixture, workspaceAuthority } from "./fixture";
import { ProviderDouble } from "./providerDouble";

function waitFor(host: ExecutionHost, state: string, runId = "run"): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { unsubscribe(); reject(new Error(`Timed out waiting for ${state}`)); }, 3000);
    const unsubscribe = host.subscribe({ after: host.header("conversation")?.cursor ?? 0, onError: reject, onEvent: (event) => {
      if (event.payload.kind === "run" && event.payload.run.id === runId && event.payload.run.state === state) {
        clearTimeout(timer); unsubscribe(); resolve();
      }
    } });
  });
}

test("host controls cannot be starved by the only long-running root effect", async (t) => {
  const f = fixture(t); f.create();
  const provider = new ProviderDouble();
  const providers = new ProviderRegistry(); providers.register(provider);
  const failures: string[] = [];
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority, owner: { id: randomUUID(), processId: process.pid },
    isProcessAlive: () => true, now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, effectConcurrency: 1,
    onFailure: (failure) => failures.push(failure.message) });
  host.start();
  try {
    const running = waitFor(host, "running");
    await host.execute({ kind: "submit", commandId: "send", conversationId: "conversation", runId: "run", instruction: "Run" });
    await running;
    const interrupted = waitFor(host, "interrupted");
    await host.execute({ kind: "interrupt", commandId: "stop", conversationId: "conversation", runId: "run" });
    await interrupted;
    assert.equal(host.summaries()[0].latestRun?.state, "interrupted");
    assert.deepEqual(failures, []);
  } finally { assert.deepEqual(await host.shutdown(), { unconfirmedRuns: [] }); }
});

test("slow review cannot block the next native turn or its interrupt control", async (t) => {
  const f = fixture(t); f.create();
  const provider = new ProviderDouble(); const providers = new ProviderRegistry(); providers.register(provider);
  let release = (): void => {};
  let entered = (): void => {};
  const startedReview = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const failures: string[] = [];
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority,
    owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true,
    now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, effectConcurrency: 1,
    reviewer: async () => { entered(); await gate; return { status: "ready", scope: "workspace", paths: [] }; },
    onFailure: (failure) => failures.push(failure.message) });
  host.start();
  try {
    const running = waitFor(host, "running");
    await host.execute({ kind: "submit", commandId: "send", conversationId: "conversation", runId: "run", instruction: "Run" });
    await running;
    await host.execute({ kind: "submit", commandId: "next", conversationId: "conversation", runId: "next", instruction: "Next" });
    const nextRunning = waitFor(host, "running", "next");
    const attempt = f.snapshot().runs[0].attemptId;
    provider.finish(attempt, "completed");
    await Promise.all([startedReview, nextRunning]);
    assert.equal(f.snapshot().runs[0].state, "completed"); assert.equal(f.snapshot().runs[0].review, "pending");
    const interrupted = waitFor(host, "interrupted", "next");
    await host.execute({ kind: "interrupt", commandId: "stop", conversationId: "conversation", runId: "next" });
    await interrupted;
    assert.equal(provider.starts, 2); assert.deepEqual(failures, []);
  } finally { release(); await host.shutdown(); }
});

test("host serves a native request while its root worker waits, then dispatches the next queued turn", async (t) => {
  const f = fixture(t); f.create();
  const provider = new ProviderDouble(true, true);
  const providers = new ProviderRegistry(); providers.register(provider);
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority, owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true,
    now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, effectConcurrency: 1, onFailure() {} });
  host.start();
  try {
    const awaiting = waitFor(host, "awaiting-approval");
    await host.execute({ kind: "submit", commandId: "send", conversationId: "conversation", runId: "run", instruction: "Run" });
    await host.execute({ kind: "submit", commandId: "next", conversationId: "conversation", runId: "next", instruction: "Next" });
    await awaiting;
    const next = waitFor(host, "awaiting-approval", "next");
    await host.execute({ kind: "respond", commandId: "answer", conversationId: "conversation", requestId: "run-request", response: { kind: "approval", optionId: "allow" } });
    await next;
    assert.equal(provider.starts, 2);
    assert.equal(f.snapshot().runs[0].state, "completed");
  } finally { await host.shutdown(); }
});

test("closing a subscription leaves execution running; explicit shutdown preserves unconfirmed native work", async (t) => {
  const f = fixture(t); f.create();
  const provider = new ProviderDouble(false);
  const providers = new ProviderRegistry(); providers.register(provider);
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority, owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true,
    now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, effectConcurrency: 1, shutdownGraceMs: 0, onFailure() {} });
  host.start();
  try {
    const running = waitFor(host, "running");
    await host.execute({ kind: "submit", commandId: "send", conversationId: "conversation", runId: "run", instruction: "Run" });
    await running;
    const unsubscribe = host.subscribe({ after: host.header("conversation")?.cursor ?? 0, onEvent() {}, onError() {} });
    unsubscribe();
    assert.equal(provider.active.size, 1);
    assert.throws(() => host.history("conversation", 0, 1000), /between 1 and 200/);
    assert.ok(host.history("conversation", 0, 2).events.length <= 2);
    const attemptId = host.header("conversation")?.activeRuns[0].attemptId;
    assert.deepEqual(await host.shutdown(), { unconfirmedRuns: [{ environmentId: "local", conversationId: "conversation", runId: "run", attemptId }] });
    f.restart();
    assert.equal(f.snapshot().runs[0].state, "recovering");
    assert.equal(f.store.ownership(), null);
  } finally { await host.shutdown(); }
});

test("native status checks cannot be starved by an uncertain root that still holds its worker slot", async (t) => {
  const f = fixture(t); f.create();
  const provider = new ProviderDouble(true, false, true);
  const providers = new ProviderRegistry(); providers.register(provider);
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority, owner: { id: randomUUID(), processId: process.pid },
    isProcessAlive: () => true, now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, effectConcurrency: 1, onFailure() {} });
  host.start();
  try {
    const running = waitFor(host, "running");
    await host.execute({ kind: "submit", commandId: "send", conversationId: "conversation", runId: "run", instruction: "Run" });
    await running;
    const run = f.snapshot().runs[0];
    const active = provider.active.get(run.attemptId); assert.ok(active);
    active.emit({ kind: "disconnected", eventId: "lost", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
      failure: { code: "uncertain", message: "Native owner needs a status check", retryable: false } });
    const completed = waitFor(host, "completed");
    await host.execute({ kind: "reconcile", commandId: "check", conversationId: "conversation", runId: run.id });
    await completed; assert.equal(provider.starts, 1); assert.equal(provider.active.size, 0);
  } finally { await host.shutdown(); }
});
