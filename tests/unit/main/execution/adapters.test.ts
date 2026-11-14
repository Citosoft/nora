import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
import { questionGuidance } from "@main/execution/questionGuidance";
import { snapshotBot } from "@shared/bots/snapshot";

const server = join(process.cwd(), "tests/unit/main/execution/fixtures/codexServer.cjs");
const now = () => "2026-10-21T10:00:00.000Z";

test("Codex applies the compact native output ceiling on start and resume without increasing a stricter user limit", async (t) => {
  const f = fixture(t); f.create();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server], compactToolOutput: () => true,
    environment: { NORA_CODEX_FIXTURE_MODE: "guidance", NORA_CODEX_OUTPUT_LIMIT: "500", NORA_CODEX_EXPECT_OUTPUT_LIMIT: "500" },
    policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
  const providers = new ProviderRegistry(); providers.register(adapter); const worker = new EffectWorker(f.engine, providers);
  try {
    for (const run of ["first", "resumed"]) {
      f.submit(run); const done = waitFor(f.engine, "completed"); await worker.runNext(["start"]); await done; await worker.runNext(["review"]);
    }
    assert.deepEqual(f.snapshot().runs.map((run) => run.state), ["completed", "completed"]);
  } finally { await providers.close(); }
});
const discover = async () => ({ models: [], authentication: "unknown" as const });

test("Codex counts only this turn across requests, external work and a Nora restart", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "nora-turn-usage-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const rollout = join(directory, "rollout.jsonl"); writeFileSync(rollout, "");
  const f = fixture(t); f.create();
  for (const runId of ["first", "resumed"]) {
    const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
      environment: { NORA_CODEX_FIXTURE_MODE: "turn-usage", NORA_CODEX_FIXTURE_ROLLOUT_PATH: rollout },
      policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
    const registry = new ProviderRegistry(); registry.register(adapter);
    try {
      f.submit(runId);
      const done = waitFor(f.engine, "completed");
      const worker = new EffectWorker(f.engine, registry);
      await worker.runNext(["start"]); await done; await worker.runNext(["review"]);
      assert.deepEqual(f.snapshot().runs.find((run) => run.id === runId)?.usage,
        { inputTokens: 300, outputTokens: 30, cachedInputTokens: 160, cacheCreationInputTokens: 70 });
      assert.equal(f.snapshot().conversation.context?.usedTokens, 220, "latest-request occupancy is not turn usage");
    } finally { await registry.close(); }
    if (runId === "first") {
      // A different native client did work while Nora was closed; its tokens are not this next turn's.
      writeFileSync(rollout, JSON.stringify({ type: "event_msg", payload: { type: "token_count", info: {
        total_token_usage: { input_tokens: 5000, output_tokens: 500, cached_input_tokens: 3000, cache_write_input_tokens: 1000 },
        last_token_usage: { input_tokens: 200, output_tokens: 20, cached_input_tokens: 100, cache_write_input_tokens: 50 }, model_context_window: 200000
      } } }) + "\n");
      f.restart();
    }
  }
});

test("resumed Codex turns without a native baseline retain live context but do not claim lifetime totals as turn usage", async (t) => {
  const f = fixture(t); f.create();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
    environment: { NORA_CODEX_FIXTURE_MODE: "context-cache" },
    policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    for (const id of ["first", "resumed"]) {
      f.submit(id); const done = waitFor(f.engine, "completed");
      await worker.runNext(["start"]); await done; await worker.runNext(["review"]);
    }
    assert.equal(f.snapshot().runs[1].usage, null);
    assert.equal(f.snapshot().conversation.context?.usedTokens, 1050);
  } finally { await registry.close(); }
});

test("Claude receives the configured compaction threshold on each new turn and clearing it restores native defaults", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" });
  let threshold: number | null = 300_000;
  const opened: ClaudeOpenInput[] = [];
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default" }, now, nextId: randomUUID, discover,
    autoCompactTokens: () => threshold,
    open(input) {
      opened.push(input);
      return { close() {}, async interrupt() {}, async *[Symbol.asyncIterator](): AsyncGenerator<ClaudeFrame> {
        yield { kind: "finished", eventId: "finished", status: "completed", failure: null, usage: { inputTokens: 0, outputTokens: 0 } };
      } };
    } });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    f.submit("first"); await worker.runNext(["start"]); await worker.runNext(["review"]);
    threshold = null;
    f.submit("second"); await worker.runNext(["start"]);
    assert.equal(opened[0].autoCompactTokens, 300_000);
    assert.equal(opened[1].autoCompactTokens, undefined);
    assert.equal(opened[1].resume, true);
  } finally { await registry.close(); }
});

test("Codex retains cache accounting when occupancy stays unchanged and cache reuse changes", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
    environment: { NORA_CODEX_FIXTURE_MODE: "context-cache" },
    policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
  const registry = new ProviderRegistry(); registry.register(adapter);
  try {
    const done = waitFor(f.engine, "completed");
    await new EffectWorker(f.engine, registry).runNext(["start"]); await done;
    assert.deepEqual(f.snapshot().conversation.context, { usedTokens: 1050, windowTokens: 200000, inputTokens: 1000,
      cachedInputTokens: 800, cacheCreationInputTokens: 200, outputTokens: 50, updatedAt: now() });
    assert.deepEqual(f.snapshot().runs[0].usage, { inputTokens: 1000, outputTokens: 50, cachedInputTokens: 800, cacheCreationInputTokens: 200 });
  } finally { await registry.close(); }
});

test("Codex discovers steering support from the runtime and sends input to the exact active turn", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server], environment: { NORA_CODEX_FIXTURE_MODE: "hold" },
    policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    assert.equal(adapter.capabilities.steering, false);
    await worker.runNext(["start"]);
    assert.equal(adapter.capabilities.steering, true);
    const snapshot = f.store.execution("conversation", "run"); assert.ok(snapshot);
    assert.deepEqual(await adapter.steer({ snapshot, run: snapshot.runs[0] }, "Focus on tests"), { status: "accepted" });
    assert.equal((await adapter.steer({ snapshot, run: { ...snapshot.runs[0], nativeTurnId: "other" } }, "Wrong turn")).status, "rejected");
  } finally { await registry.close(); }
});

test("runtimes without turn/steer do not advertise steering", async () => {
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server], environment: { NORA_CODEX_FIXTURE_MODE: "no-steering" },
    policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
  try { const result = await adapter.catalog({ environmentId: "local", projectId: "p", checkoutId: "c", path: "/tmp", branch: "main", access: "read" });
    assert.equal(result.status, "available"); if (result.status === "available") assert.equal(result.catalog.capabilities.steering, false);
  } finally { await adapter.close(); }
});
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

test("Codex sends the saved role through structured thread instructions on start and resume", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", provider, { id: "writing" });
  const guidance = f.snapshot().conversation.role?.guidance;
  assert.ok(guidance);
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
    environment: { NORA_CODEX_FIXTURE_MODE: "guidance", NORA_CODEX_EXPECT_GUIDANCE: questionGuidance("request_user_input", guidance) },
    policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    for (const runId of ["first", "follow-up"]) {
      f.submit(runId);
      const done = waitFor(f.engine, "completed");
      await worker.runNext(); await done; await worker.runNext(["review"]);
      assert.equal(f.snapshot().conversation.role?.guidance, guidance);
    }
  } finally { await registry.close(); }
});

test("Claude receives a separate saved guidance field while the user's instruction stays unchanged", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" }, { id: "research" });
  const opened: ClaudeOpenInput[] = [];
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default" }, now, nextId: randomUUID, discover,
    open(input) {
      opened.push(input);
      return { async interrupt() {}, close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<ClaudeFrame> {
        yield { kind: "init", eventId: "init", sessionId: input.sessionId };
        yield { kind: "finished", eventId: "done", status: "completed", failure: null, usage: { inputTokens: 0, outputTokens: 0 } };
      } };
    } });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  for (const id of ["first", "follow-up"]) { f.submit(id); await worker.runNext(); await worker.runNext(["review"]); }
  assert.equal(opened.length, 2);
  assert.equal(opened[0].instruction, "first"); assert.equal(opened[1].instruction, "follow-up");
  assert.equal(opened[0].guidance, f.snapshot().conversation.role?.guidance);
  assert.equal(opened[1].guidance, opened[0].guidance); assert.equal(opened[1].resume, true);
  await registry.close();
});

test("Claude gets this turn's note changes in front of the instruction while its guidance stays fixed", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" }, { id: "research" });
  const opened: ClaudeOpenInput[] = [];
  const turns = [null, "<nora_note_update>\n- [n1] Prefers tabs\n</nora_note_update>"];
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default" }, now, nextId: randomUUID, discover,
    runContext: async () => ({ tools: null, guidance: "Your saved notes: none", turnNotes: turns[opened.length] ?? null }),
    open(input) {
      opened.push(input);
      return { async interrupt() {}, close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<ClaudeFrame> {
        yield { kind: "init", eventId: "init", sessionId: input.sessionId };
        yield { kind: "finished", eventId: "done", status: "completed", failure: null, usage: { inputTokens: 0, outputTokens: 0 } };
      } };
    } });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  for (const id of ["first", "follow-up"]) { f.submit(id); await worker.runNext(); await worker.runNext(["review"]); }
  assert.deepEqual(opened.map((input) => input.instruction), ["first", "<nora_note_update>\n- [n1] Prefers tabs\n</nora_note_update>\n\nfollow-up"]);
  assert.equal(opened[1].guidance, opened[0].guidance);
  assert.match(opened[0].guidance ?? "", /Your saved notes: none/);
  await registry.close();
});

test("Claude receives a bot thread's guidance instead of the role's", async (t) => {
  const f = fixture(t);
  const bot = snapshotBot({ id: "ada", name: "Ada", role: "Reviewer", instructions: "Review carefully.", avatar: { seed: 1 }, scope: { kind: "global" }, revision: 1,
    binding: { kind: "claude", instanceId: "account-a", model: provider.model, reasoning: null, permissionPolicy: null } });
  f.engine.execute({ kind: "create", commandId: "create", conversationId: "conversation", title: "Bot", parentId: null, botId: "ada", provider: { ...provider, kind: "claude" },
    workspace: { environmentId: "local", projectId: "project", checkoutId: "checkout", path: "/test/checkout", branch: "main", access: "write" } }, { bot, role: { id: "research" } });
  const opened: ClaudeOpenInput[] = [];
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default" }, now, nextId: randomUUID, discover,
    open(input) {
      opened.push(input);
      return { async interrupt() {}, close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<ClaudeFrame> {
        yield { kind: "init", eventId: "init", sessionId: input.sessionId };
        yield { kind: "finished", eventId: "done", status: "completed", failure: null, usage: { inputTokens: 0, outputTokens: 0 } };
      } };
    } });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  f.submit("first"); await worker.runNext(); await worker.runNext(["review"]);
  assert.equal(opened[0].guidance, bot.guidance);
  assert.match(opened[0].guidance ?? "", /Review carefully\./);
  await registry.close();
});

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
      if (request.kind === "question") {
        assert.deepEqual(request.questions[0].options, ["A", "B"]);
        assert.equal(request.questions[0].allowOther, true);
      }
      assert.equal(snapshot.items.filter((item) => item.kind === "message" && item.role === "assistant").length, 1);
      const completed = waitFor(f.engine, "completed");
      f.command({ kind: "respond", commandId: "answer", conversationId: "conversation", requestId: request.id,
        response: mode === "approval" ? { kind: "approval", optionId: "accept" } : { kind: "question", answers: { pick: ["A"] } } });
      await worker.runNext(); await completed;
      await worker.runNext(["review"]);
      assert.equal(f.snapshot().requests[0].status, "resolved");
      assert.equal(f.snapshot().runs[0].state, "completed");
      f.submit("second");
      const secondCompleted = waitFor(f.engine, "completed");
      await worker.runNext(); await secondCompleted;
    } finally { await adapter.close(); }
  });
}

test("Codex tool events persist activity, preserve streamed output and settle incomplete tools", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
    environment: { NORA_CODEX_FIXTURE_MODE: "tools" }, policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    const done = waitFor(f.engine, "completed");
    await worker.runNext(); await done;
    const tools = f.snapshot().items.filter((item) => item.kind === "tool");
    const integration = tools.find((item) => item.label === "search");
    assert.equal(integration?.state, "completed");
    assert.equal(integration?.output, "Found documentation");
    assert.ok(integration?.details?.input?.includes("[redacted]"));
    const command = tools.find((item) => item.label === "Run command");
    assert.equal(command?.output, "Test failure"); assert.equal(command?.state, "failed");
    assert.equal(tools.find((item) => item.label === "Edit files")?.state, "declined");
    assert.equal(tools.find((item) => item.label === "Edit files")?.details?.patch, "@@ -1 +1,2 @@\n-old\n+new\n+added\n");
    const changes = f.snapshot().items.find((item) => item.kind === "changes");
    assert.equal(changes?.kind === "changes" && changes.patches?.["src/index.ts"], "@@ -1 +1,2 @@\n-old\n+new\n+added\n");
    assert.equal(tools.find((item) => item.label === "futureTool")?.state, "unconfirmed");
    assert.equal(tools.some((item) => item.state === "running"), false);
    assert.ok(!JSON.stringify(tools).includes('"private"'));
  } finally { await registry.close(); }
});

test("Codex approval context falls back to its tool and returns the exact scoped decision", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
    environment: { NORA_CODEX_FIXTURE_MODE: "scoped-approval" }, policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } }, now });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    const ready = waitFor(f.engine, "awaiting-approval"); await worker.runNext(); await ready;
    const request = f.snapshot().requests[0]; assert.equal(request.kind, "approval");
    if (request.kind !== "approval") throw new Error("Expected approval");
    assert.equal(request.details?.command, "npm test"); assert.equal(request.details?.workingDirectory, "/workspace");
    assert.equal(request.options[1].scope, "persistent");
    const done = waitFor(f.engine, "completed");
    f.command({ kind: "respond", commandId: "answer", conversationId: "conversation", requestId: request.id,
      response: { kind: "approval", optionId: request.options[1].id } });
    await worker.runNext(); await done;
    assert.equal(f.snapshot().requests[0].status, "resolved");
  } finally { await registry.close(); }
});

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
      if (mode === "usage") assert.equal(f.snapshot().runs[0].failure?.resetsAt, new Date(1792587600 * 1000).toISOString());
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
        yield { kind: "prompt-suggestion", eventId: "suggestion", suggestion: "Review the test coverage." };
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
  await worker.runNext(["review"]);
  const messages = f.snapshot().items.filter((item) => item.kind === "message" && item.role === "assistant");
  assert.equal(messages.length, 1);
  assert.equal(f.snapshot().runs[0].state, "completed");
  assert.equal(f.snapshot().runs[0].promptSuggestion, "Review the test coverage.");
  assert.equal(adapter.capabilities.promptSuggestions, true);
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

test("Claude receives the thread's subagent model and stores reported agents with their model", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude", subagentModel: "haiku" }); f.submit();
  const opened: ClaudeOpenInput[] = [];
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default" }, now, nextId: randomUUID, discover,
    open(input) {
      opened.push(input);
      return { async interrupt() {}, close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<ClaudeFrame> {
        yield { kind: "init", sessionId: input.sessionId, eventId: "init" };
        yield { kind: "subagent", eventId: "agent", nativeId: "agent", label: "Review", state: "completed", model: "claude-haiku-5-5", effort: "low", result: "Done" };
        yield { kind: "finished", eventId: "result", status: "completed", failure: null, usage: { inputTokens: 1, outputTokens: 1 } };
      } };
    } });
  const registry = new ProviderRegistry(); registry.register(adapter);
  await new EffectWorker(f.engine, registry).runNext();
  assert.equal(opened[0].subagentModel, "haiku");
  assert.equal(adapter.capabilities.subagentModel, true);
  const agent = f.snapshot().items.find((item) => item.kind === "subagent");
  assert.ok(agent?.kind === "subagent");
  assert.equal(agent.model, "claude-haiku-5-5"); assert.equal(agent.effort, "low"); assert.equal(agent.result, "Done");
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

test("a new Claude instruction closes a completed turn's pending prediction before resuming its session", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" }); f.submit("first");
  let releaseTail = (): void => {};
  const tail = new Promise<void>((resolve) => { releaseTail = resolve; });
  let opened = 0;
  let firstClosed = false;
  const adapter = new ClaudeAdapter({ instanceId: "account-a", policies: { "native-default": "default" }, now, nextId: randomUUID, discover,
    open(input) {
      const first = opened++ === 0;
      if (!first) assert.equal(firstClosed, true);
      return { async interrupt() {}, close() { if (first) { firstClosed = true; releaseTail(); } },
        async *[Symbol.asyncIterator](): AsyncGenerator<ClaudeFrame> {
          yield { kind: "init", sessionId: input.sessionId, eventId: "init" };
          yield { kind: "finished", eventId: "result", status: "completed", failure: null, usage: { inputTokens: 0, outputTokens: 0 } };
          if (first) await tail;
          yield { kind: "prompt-suggestion", eventId: "suggestion", suggestion: first ? "Old suggestion" : "New suggestion" };
        } };
    } });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    const completed = waitFor(f.engine, "completed");
    const first = worker.runNext(["start"]);
    await completed;
    assert.equal(firstClosed, false, "Completion does not wait for the optional suggestion");
    await worker.runNext(["review"]);
    f.submit("second");
    await worker.runNext(["start"]); await first;
    assert.equal(opened, 2);
    assert.equal(f.snapshot().runs[1].promptSuggestion, "New suggestion");
  } finally { await adapter.close(); }
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

test("Codex model discovery paginates and preserves advertised reasoning without invoking a turn", async (t) => {
  const f = fixture(t); f.create();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server], policies: {
    "native-default": { approvalPolicy: "on-request", sandbox: "read-only" } }, now });
  try {
    const result = await adapter.catalog(f.snapshot().conversation.workspace);
    assert.equal(result.status, "available");
    assert.ok(result.status === "available");
    assert.equal(result.catalog.authentication, "present");
    assert.deepEqual(result.catalog.models.map((model) => model.id), ["first-model", "second-model"]);
    assert.deepEqual(result.catalog.models[0].reasoningEfforts, ["medium", "ultra"]);
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
