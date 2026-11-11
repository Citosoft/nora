import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { TestContext } from "node:test";
import { AcpAdapter } from "@main/providers/acp/adapter";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import type { ConversationEngine } from "@main/execution/engine";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import { timelineItemSchema } from "@shared/conversations/contracts";
import { fixture } from "./fixture";

const agent = join(process.cwd(), "tests/unit/main/execution/fixtures/acpAgent.cjs");
const now = () => "2026-10-21T10:00:00.000Z";
const binding: ProviderBinding = { kind: "opencode", instanceId: "local", model: "m2", reasoning: "high", permissionPolicy: "code" };
const workspace = { environmentId: "local", projectId: "p", checkoutId: "c", path: "/tmp", branch: "main", access: "read" as const };

function harness(t: TestContext, mode: string) {
  const directory = mkdtempSync(join(tmpdir(), "nora-acp-"));
  const log = join(directory, "calls.log");
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const adapter = new AcpAdapter({ kind: "opencode", instanceId: "local", label: "OpenCode", executable: process.execPath, args: [agent],
    environment: { NORA_ACP_FIXTURE_MODE: mode, NORA_ACP_FIXTURE_LOG: log }, now, setupTimeoutMs: 5000 });
  const calls = (): string[] => { try { return readFileSync(log, "utf8").trim().split("\n").filter(Boolean); } catch { return []; } };
  return { adapter, calls };
}

function waitFor(engine: ConversationEngine, state: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let unsubscribe = (): void => {};
    let settled = false;
    const timer = setTimeout(() => { unsubscribe(); reject(new Error(`Timed out awaiting ${state}`)); }, 5000);
    unsubscribe = engine.subscribe({ after: engine.snapshot("conversation")?.cursor ?? 0, conversationId: "conversation", onError: reject, onEvent: (event) => {
      if (!settled && event.payload.kind === "run" && event.payload.run.state === state) { settled = true; clearTimeout(timer); unsubscribe(); resolve(); }
    } });
    if (settled) unsubscribe();
  });
}

test("ACP catalog reads models, reasoning and modes from a probe session without prompting", async (t) => {
  const { adapter, calls } = harness(t, "stream");
  try {
    const result = await adapter.catalog(workspace);
    assert.equal(result.status, "available");
    if (result.status !== "available") return;
    assert.deepEqual(result.catalog.models.map((model) => [model.id, model.reasoningEfforts]), [["m1", ["low", "high"]], ["m2", ["low", "high"]]]);
    assert.deepEqual(result.catalog.policies, [{ id: "ask", label: "Ask" }, { id: "code", label: "Code" }]);
    assert.equal(result.catalog.authentication, "present");
    assert.equal(result.catalog.capabilities.questions, false);
    assert.equal(result.catalog.capabilities.resume, false, "the fixture agent cannot load or resume sessions");
    assert.ok(!calls().includes("session/prompt"));
  } finally { await adapter.close(); }
});

test("ACP account reads sign-in state through session setup and reports auth-required as signed out", async (t) => {
  const signedIn = harness(t, "stream");
  const signedOut = harness(t, "auth");
  const rejected = harness(t, "auth-rejected");
  try {
    assert.deepEqual(await rejected.adapter.account({ kind: "login" }), { kind: "unavailable", message: "OpenCode sign-in failed: This account type is not supported" });
    assert.deepEqual(await signedIn.adapter.account({ kind: "read" }), { kind: "account", account: { state: "signed-in", method: "Fixture Agent", label: null } });
    assert.deepEqual(await signedOut.adapter.account({ kind: "read" }), { kind: "account", account: { state: "signed-out" } });
    assert.deepEqual(await signedOut.adapter.account({ kind: "login" }), { kind: "login-started" });
  } finally { await signedIn.adapter.close(); await signedOut.adapter.close(); await rejected.adapter.close(); }
});

test("ACP turns apply the selected controls, stream one assistant message and settle tools and plans", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", binding); f.submit();
  const { adapter, calls } = harness(t, "stream");
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    const done = waitFor(f.engine, "completed");
    await worker.runNext(["start"]); await done;
    const snapshot = f.snapshot();
    assert.equal(snapshot.conversation.nativeConversationId, "session-1");
    for (const item of snapshot.items) timelineItemSchema.parse(item);
    const messages = snapshot.items.filter((item) => item.kind === "message" && item.role === "assistant");
    assert.equal(messages.length, 1);
    assert.ok(messages[0].kind === "message" && messages[0].text === "Hello" && messages[0].complete);
    const reasoning = snapshot.items.find((item) => item.kind === "reasoning");
    assert.ok(reasoning?.kind === "reasoning" && reasoning.text === "Thinking" && reasoning.complete);
    const tool = snapshot.items.find((item) => item.kind === "tool");
    assert.ok(tool?.kind === "tool");
    assert.equal(tool.state, "completed");
    assert.equal(tool.output, "a.txt");
    assert.equal(tool.details?.category, "command");
    assert.ok(tool.details?.input?.includes("[redacted]") && !tool.details.input.includes("secret-value"));
    const plan = snapshot.items.find((item) => item.kind === "plan");
    assert.deepEqual(plan?.kind === "plan" && plan.steps, [{ text: "Read", state: "completed" }, { text: "Write", state: "running" }]);
    assert.deepEqual(calls().filter((call) => call.startsWith("session/")),
      ["session/new", "session/set_mode", "session/set_config_option", "session/set_config_option", "session/prompt"]);
  } finally { await registry.close(); }
});

for (const [optionId, expected] of [["yes", "completed"], ["no", "failed"]] as const) {
  test(`ACP permission requests become approvals and return the chosen option (${optionId})`, async (t) => {
    const f = fixture(t); f.create("conversation", "checkout", binding); f.submit();
    const { adapter } = harness(t, "approval");
    const registry = new ProviderRegistry(); registry.register(adapter);
    const worker = new EffectWorker(f.engine, registry);
    try {
      const awaiting = waitFor(f.engine, "awaiting-approval");
      const turn = worker.runNext(["start"]);
      await awaiting;
      const request = f.snapshot().requests[0];
      assert.equal(request.kind, "approval");
      if (request.kind !== "approval") return;
      assert.deepEqual(request.options.map((option) => [option.id, option.intent, option.scope]),
        [["yes", "allow", "once"], ["always", "allow", "persistent"], ["no", "deny", "once"]]);
      assert.equal(request.details?.kind, "command");
      const completed = waitFor(f.engine, "completed");
      f.command({ kind: "respond", commandId: "answer", conversationId: "conversation", requestId: request.id, response: { kind: "approval", optionId } });
      await worker.runNext(["respond"]); await turn; await completed;
      const snapshot = f.snapshot();
      assert.equal(snapshot.requests[0].status, "resolved");
      assert.equal(snapshot.items.find((item) => item.kind === "tool")?.kind === "tool" && snapshot.items.find((item) => item.kind === "tool")?.state, expected);
      assert.ok(snapshot.items.some((item) => item.kind === "message" && item.text === `decision:${optionId}`));
    } finally { await registry.close(); }
  });
}

test("ACP interrupt answers pending permissions as cancelled and finishes interrupted", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", binding); f.submit();
  const { adapter } = harness(t, "approval-hold");
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    const awaiting = waitFor(f.engine, "awaiting-approval");
    const turn = worker.runNext(["start"]);
    await awaiting;
    const interrupted = waitFor(f.engine, "interrupted");
    f.command({ kind: "interrupt", commandId: "stop", conversationId: "conversation", runId: "run" });
    await worker.runNext(["interrupt"]); await turn; await interrupted;
    assert.equal(f.snapshot().runs[0].state, "interrupted");
  } finally { await registry.close(); }
});

test("ACP interrupt of a running prompt sends session/cancel and the cancelled stop reason confirms it", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", binding); f.submit();
  const { adapter, calls } = harness(t, "hold");
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    const running = waitFor(f.engine, "running");
    const turn = worker.runNext(["start"]);
    await running;
    const interrupted = waitFor(f.engine, "interrupted");
    f.command({ kind: "interrupt", commandId: "stop", conversationId: "conversation", runId: "run" });
    await worker.runNext(["interrupt"]); await turn; await interrupted;
    assert.ok(calls().includes("session/cancel"));
  } finally { await registry.close(); }
});

test("ACP agent exit during a turn leaves the run recovering, and reconcile never resends the prompt", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", binding); f.submit();
  const { adapter, calls } = harness(t, "crash");
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    const recovering = waitFor(f.engine, "recovering");
    await worker.runNext(["start"]); await recovering;
    assert.ok(f.snapshot().items.every((item) => item.kind !== "tool" || item.state !== "running"));
    f.engine.recover(); await worker.runNext(["reconcile"]);
    assert.equal(f.snapshot().runs[0].state, "recovering");
    assert.equal(calls().filter((call) => call === "session/prompt").length, 1);
  } finally { await registry.close(); }
});

test("ACP auth-required during setup fails the run with an authentication failure before any prompt", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", binding); f.submit();
  const { adapter, calls } = harness(t, "auth");
  const registry = new ProviderRegistry(); registry.register(adapter);
  const worker = new EffectWorker(f.engine, registry);
  try {
    const failed = waitFor(f.engine, "failed");
    await worker.runNext(["start"]); await failed;
    assert.equal(f.snapshot().runs[0].failure?.code, "authentication");
    assert.ok(!calls().includes("session/prompt"));
  } finally { await registry.close(); }
});
