import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { join } from "node:path";
import test from "node:test";
import { z } from "zod";
import { ClaudeAdapter } from "@main/providers/claude/adapter";
import { CodexAdapter } from "@main/providers/codex/adapter";
import { StdioRpc } from "@main/providers/codex/stdioRpc";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import type { ClaudeFrame, ClaudeOpenInput } from "@main/types/execution/claude.types";
import type { ConversationEngine } from "@main/execution/engine";
import { fixture, provider } from "./fixture";

const server = join(process.cwd(), "tests/unit/main/execution/fixtures/codexServer.cjs");
const now = () => "2026-10-21T10:00:00.000Z";
const discover = async () => ({ models: [], authentication: "unknown" as const });
function waitFor(engine: ConversationEngine, state: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let unsubscribe = (): void => {};
    let settled = false;
    const timer = setTimeout(() => { unsubscribe(); reject(new Error(`Timed out awaiting ${state}`)); }, 5000);
    unsubscribe = engine.subscribe({ after: engine.snapshot("conversation")?.cursor ?? 0, conversationId: "conversation", onError: reject, onEvent: (event) => {
      if (!settled && event.payload.kind === "run" && event.payload.run.state === state) {
        settled = true; clearTimeout(timer); unsubscribe(); resolve();
      }
    } });
    if (settled) unsubscribe();
  });
}

test("Codex RPC correlates replies, preserves split UTF-8 and rejects malformed frames without diagnostic leakage", async () => {
  const rpc = new StdioRpc({ process: spawn(process.execPath, [server]), onNotification() {},
    async onRequest() { return null; }, onDisconnect() {} });
  try {
    const results = await Promise.all([rpc.request("echo", { number: 1 }, z.object({ number: z.number() })), rpc.request("unicode", {}, z.string())]);
    assert.deepEqual(results, [{ number: 1 }, "👋 café"]);
    await assert.rejects(rpc.request("rpcError", {}, z.json()), (error: Error) => !error.message.includes("secret"));
    await assert.rejects(rpc.request("malformed", {}, z.json()), /connection lost/);
  } finally { rpc.close(); }
});

for (const mode of ["approval", "question"]) {
  test(`Codex native ${mode}, streaming, final deduplication and confirmed completion`, async (t) => {
    const f = fixture(t); f.create(); f.submit();
    const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
      environment: { NORA_CODEX_FIXTURE_MODE: mode }, policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
    const registry = new ProviderRegistry(); registry.register(adapter);
    const worker = new EffectWorker(f.engine, registry);
    try {
      const requestReady = waitFor(f.engine, mode === "approval" ? "awaiting-approval" : "awaiting-input");
      await worker.runNext(); await requestReady;
      const snapshot = f.snapshot();
      const request = snapshot.requests[0];
      assert.equal(snapshot.items.filter((item) => item.kind === "message" && item.role === "assistant").length, 1);
      const completed = waitFor(f.engine, "completed");
      f.command({ kind: "respond", commandId: "answer", conversationId: "conversation", requestId: request.id,
        response: mode === "approval" ? { kind: "approval", optionId: "accept" } : { kind: "question", answers: { pick: ["A"] } } });
      await worker.runNext(); await completed;
      assert.equal(f.snapshot().requests[0].status, "resolved");
      assert.equal(f.snapshot().runs[0].state, "completed");
      f.submit("second");
      const secondCompleted = waitFor(f.engine, "completed");
      await worker.runNext(); await secondCompleted;
    } finally { await adapter.close(); }
  });
}

test("Codex process loss remains recovering and exact native-turn recovery uses read rather than resubmit", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server], environment: { NORA_CODEX_FIXTURE_MODE: "crash" },
    policies: { "native-default": { approvalPolicy: "on-request", sandbox: "read-only" } }, now });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    const lost = waitFor(f.engine, "recovering");
    await worker.runNext(); await lost;
    assert.equal(f.snapshot().conversation.nativeConversationId, "thread");
    f.engine.recover();
    await worker.runNext();
    assert.equal(f.snapshot().runs[0].state, "completed");
  } finally { await adapter.close(); }
});

for (const mode of ["auth", "usage", "hold"]) {
  test(`Codex ${mode} outcome is native-confirmed and pauses queued instructions`, async (t) => {
    const f = fixture(t); f.create(); f.submit(); f.submit("queued");
    const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server], environment: { NORA_CODEX_FIXTURE_MODE: mode },
      policies: { "native-default": { approvalPolicy: "on-request", sandbox: "read-only" } }, now });
    const registry = new ProviderRegistry(); registry.register(adapter);
    const worker = new EffectWorker(f.engine, registry);
    try {
      const finished = waitFor(f.engine, mode === "hold" ? "interrupted" : "failed");
      await worker.runNext();
      if (mode === "hold") {
        f.command({ kind: "interrupt", commandId: "stop", conversationId: "conversation", runId: "run" });
        await worker.runNext();
      }
      await finished;
      assert.equal(f.snapshot().runs[1].state, "queued");
      assert.equal(f.snapshot().conversation.queuePaused, true);
      if (mode !== "hold") assert.equal(f.snapshot().runs[0].failure?.code, mode === "auth" ? "authentication" : "usage-limit");
    } finally { await adapter.close(); }
  });
}

test("Claude SDK lifecycle preserves native continuation and serves approval through the engine", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" }); f.submit();
  const opened: ClaudeOpenInput[] = [];
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default" }, now, nextId: randomUUID, discover,
    open(input) {
      opened.push(input);
      return { async interrupt() {}, close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<ClaudeFrame> {
        yield { kind: "init", sessionId: input.sessionId, eventId: "init" };
        yield { kind: "text", nativeId: "message", text: "Partial", complete: false, eventId: "delta" };
        const answer = await input.onRequest({ kind: "approval", nativeId: "tool", title: "Run tests?", signal: new AbortController().signal });
        assert.deepEqual(answer, { kind: "approval", optionId: "allow" });
        yield { kind: "text", nativeId: "message", text: "Final", complete: true, eventId: "final" };
        yield { kind: "finished", eventId: "result", status: "completed", failure: null, usage: { inputTokens: 10, outputTokens: 2 } };
      } };
    } });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  const awaiting = waitFor(f.engine, "awaiting-approval");
  const running = worker.runNext();
  await awaiting;
  const request = f.snapshot().requests[0];
  f.command({ kind: "respond", commandId: "answer", conversationId: "conversation", requestId: request.id, response: { kind: "approval", optionId: "allow" } });
  await worker.runNext(); await running;
  const messages = f.snapshot().items.filter((item) => item.kind === "message" && item.role === "assistant");
  assert.equal(messages.length, 1);
  assert.equal(f.snapshot().runs[0].state, "completed");
  assert.equal(opened[0].resume, false);
  f.submit("second");
  const nextAwaiting = waitFor(f.engine, "awaiting-approval");
  const second = worker.runNext();
  await nextAwaiting;
  const secondRequest = f.snapshot().requests.at(-1);
  assert.ok(secondRequest);
  f.command({ kind: "respond", commandId: "answer-2", conversationId: "conversation", requestId: secondRequest.id, response: { kind: "approval", optionId: "allow" } });
  await worker.runNext(); await second;
  assert.equal(opened[1].resume, true);
  assert.equal(opened[1].sessionId, opened[0].sessionId);
});

test("Claude stream loss does not fabricate completion or resubmit during reconciliation", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" }); f.submit();
  let opened = 0;
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default" }, now, nextId: randomUUID, discover,
    open(input) { opened++; return { async interrupt() {}, close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<ClaudeFrame> {
      yield { kind: "init", sessionId: input.sessionId, eventId: "init" };
    } }; } });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  await worker.runNext();
  assert.equal(f.snapshot().runs[0].state, "recovering");
  f.engine.recover(); await worker.runNext();
  assert.equal(f.snapshot().runs[0].state, "recovering");
  assert.equal(opened, 1);
});

test("Claude interruption expires the native question, preserves the queue and waits for a result", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" }); f.submit(); f.submit("queued");
  const controller = new AbortController();
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default" }, now, nextId: randomUUID, discover,
    open(input) { return { async interrupt() { controller.abort(); }, close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<ClaudeFrame> {
      yield { kind: "init", sessionId: input.sessionId, eventId: "init" };
      try { await input.onRequest({ kind: "question", nativeId: "question", title: "Choose", signal: controller.signal,
        questions: [{ id: "pick", text: "Choose", options: ["A"], multiple: false }] }); }
      catch { yield { kind: "finished", eventId: "native-interrupt-result", status: "interrupted", failure: null, usage: { inputTokens: 0, outputTokens: 0 } }; }
    } }; } });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  const awaiting = waitFor(f.engine, "awaiting-input");
  const started = worker.runNext(); await awaiting;
  const request = f.snapshot().requests[0];
  f.command({ kind: "interrupt", commandId: "stop", conversationId: "conversation", runId: "run" });
  assert.equal(f.snapshot().runs[0].state, "stopping");
  await worker.runNext(); await started;
  assert.equal(f.snapshot().runs[0].state, "interrupted");
  assert.equal(f.snapshot().runs[1].state, "queued");
  assert.equal(f.snapshot().requests[0].status, "expired");
  assert.throws(() => f.command({ kind: "respond", commandId: "late", conversationId: "conversation", requestId: request.id,
    response: { kind: "question", answers: { pick: ["A"] } } }), /no longer answerable/);
});

test("provider instances remain distinct and cannot be overwritten", () => {
  const first = new CodexAdapter({ instanceId: "first", executable: "not-started", policies: {}, now });
  const second = new CodexAdapter({ instanceId: "second", executable: "not-started", policies: {}, now });
  const registry = new ProviderRegistry(); registry.register(first); registry.register(second);
  assert.equal(registry.resolve("codex", "first"), first);
  assert.equal(registry.resolve("codex", "second"), second);
  assert.throws(() => registry.register(first), /already registered/);
  assert.throws(() => registry.resolve("claude", "first"), /not configured/);
});

test("Codex model discovery paginates without invoking a turn or implying authentication", async (t) => {
  const f = fixture(t); f.create();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server], policies: {
    "native-default": { approvalPolicy: "on-request", sandbox: "read-only" } }, now });
  try {
    const result = await adapter.catalog(f.snapshot().conversation.workspace);
    assert.equal(result.status, "available");
    assert.ok(result.status === "available");
    assert.equal(result.catalog.authentication, "required");
    assert.deepEqual(result.catalog.models.map((model) => model.id), ["first-model", "second-model"]);
    assert.equal(f.snapshot().runs.length, 0);
    assert.equal(f.snapshot().conversation.nativeConversationId, null);
  } finally { await adapter.close(); }
});

test("Claude discovery exposes normalized models and configured permission choices", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" });
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default", unsafe: "bypassPermissions" }, now, nextId: randomUUID,
    open() { throw new Error("Discovery must not open an execution turn"); }, async discover(cwd) {
      assert.equal(cwd, f.snapshot().conversation.workspace.path);
      return { authentication: "unknown", models: [{ id: "model", name: "Model", description: "Catalog", reasoningEfforts: ["medium"], defaultReasoningEffort: null }] };
    } });
  const result = await adapter.catalog(f.snapshot().conversation.workspace);
  assert.ok(result.status === "available");
  assert.deepEqual(result.catalog.policies.map((policy) => policy.id), ["native-default"]);
  assert.equal(result.catalog.models[0].id, "model");
  assert.equal(f.snapshot().runs.length, 0);
});
