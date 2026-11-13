import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";
import { prepareProviderTransition } from "@main/execution/provider-transition/prepare";
import { createThreadReferenceWriter } from "@main/execution/thread-references/writeSnapshot";
import { EffectWorker } from "@main/execution/effectWorker";
import { ExecutionHost } from "@main/execution/host";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import type { ExecutionProvider, ProviderExecution } from "@main/types/execution/provider.types";
import type { ConversationCommand, ProviderBinding } from "@shared/types/conversation/contracts.types";
import { fixture, provider, workspaceAuthority } from "./fixture";

const next: ProviderBinding = { kind: "claude", instanceId: "account-b", model: "next-model", reasoning: null, permissionPolicy: "read" };
const command: Extract<ConversationCommand, { kind: "submit" }> = { kind: "submit", commandId: "switch", conversationId: "conversation", runId: "next", instruction: "Continue the work", providerChange: { expected: provider, next } };

async function transitionFixture(t: TestContext) {
  const f = fixture(t); f.create();
  const starts: ProviderExecution[] = [];
  const original: ExecutionProvider = { kind: "codex", instanceId: provider.instanceId, capabilities: nativeCapabilities,
    async catalog() { return { status: "unavailable", failure: { code: "unsupported", message: "unused", retryable: false } }; },
    async start(execution, emit) {
      const base = { conversationId: execution.run.conversationId, runId: execution.run.id, attemptId: execution.run.attemptId };
      emit({ ...base, kind: "started", eventId: "started", nativeConversationId: "old-native-session", nativeTurnId: "old-turn" });
      emit({ ...base, kind: "item", eventId: "decision", item: { id: "decision", runId: execution.run.id, createdAt: execution.run.createdAt, kind: "message", role: "assistant", text: "Decision: preserve the public API. Next: implement the parser.", complete: true } });
      emit({ ...base, kind: "item", eventId: "reasoning", item: { id: "reasoning", runId: execution.run.id, createdAt: execution.run.createdAt, kind: "reasoning", text: "PRIVATE_REASONING", complete: true } });
      emit({ ...base, kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
    }, async close() {}, async interrupt() {}, async reconcile() {}, async respond() {} };
  const replacement: ExecutionProvider = { ...original, kind: "claude", instanceId: next.instanceId,
    async catalog() { return { status: "available", catalog: { kind: "claude", instanceId: next.instanceId, capabilities: nativeCapabilities, authentication: "present",
      models: [{ id: next.model, name: "Next", description: "", reasoningEfforts: [], defaultReasoningEffort: null }], policies: [{ id: "read", label: "Read" }] } }; },
    async start(execution, emit) {
      starts.push(execution);
      const base = { conversationId: execution.run.conversationId, runId: execution.run.id, attemptId: execution.run.attemptId };
      emit({ ...base, kind: "started", eventId: "started", nativeConversationId: "new-native-session", nativeTurnId: `new-${execution.run.id}` });
      emit({ ...base, kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
    } };
  const providers = new ProviderRegistry(); providers.register(original); providers.register(replacement);
  const worker = new EffectWorker(f.engine, providers);
  f.submit(); while (await worker.runNext()) { /* Drain start and review before a switch. */ }
  let writes = 0;
  const writer = createThreadReferenceWriter(join(dirname(f.path), "references"));
  const deps = { store: f.store, providers, workspaces: workspaceAuthority, owner: { id: randomUUID(), processId: process.pid },
    isProcessAlive: () => true, now: () => "2026-11-12T10:00:00.000Z", nextId: randomUUID,
    writeThreadReference: async (...args: Parameters<typeof writer>) => { writes++; return writer(...args); }, onFailure: () => assert.fail("host failed") };
  return { f, deps, worker, starts, replacement, get writes() { return writes; } };
}

test("provider change is durable, keeps visible history, and starts a fresh session with bounded on-demand context", async (t) => {
  const setup = await transitionFixture(t); const { f, deps, worker, starts } = setup;
  const prepared = await prepareProviderTransition(command, deps); assert.ok(prepared);
  assert.ok(Buffer.byteLength(prepared.handoff.context) <= 16_000);
  assert.match(prepared.handoff.context, /preserve the public API/);
  assert.ok(!prepared.handoff.context.includes("PRIVATE_REASONING"));
  const receipt = f.engine.execute(command, { steerFollowUp: false, providerTransition: prepared });
  assert.equal(f.snapshot().conversation.nativeConversationId, null);
  assert.equal(f.snapshot().conversation.context, null);
  assert.deepEqual(f.snapshot().conversation.provider, next);
  assert.equal(f.snapshot().runs[0].provider?.kind, "codex");
  assert.equal(f.snapshot().runs[1].handoff?.previousNativeConversationId, "old-native-session");
  assert.ok(f.snapshot().items.some((item) => item.kind === "message" && item.text.includes("preserve the public API")));
  const latestInstruction = f.snapshot().items.slice().reverse().find((item) => item.kind === "message" && item.role === "user");
  assert.ok(latestInstruction?.kind === "message"); assert.equal(latestInstruction.text, command.instruction);
  while (await worker.runNext()) { /* Drain the new provider's turn and review. */ }
  assert.equal(starts.length, 1); assert.equal(starts[0].snapshot.conversation.nativeConversationId, null);
  assert.match(starts[0].run.instruction, /Current instruction:\nContinue the work$/);
  assert.equal(f.snapshot().runs[1].instruction, command.instruction);
  assert.equal(f.snapshot().conversation.nativeConversationId, "new-native-session");
  assert.equal(f.snapshot().conversation.pendingHandoffRunId, undefined);
  f.restart(); assert.deepEqual(f.engine.execute(command), receipt);
  assert.equal(f.snapshot().runs.length, 2);
  assert.ok(f.snapshot().runs[1].handoff?.context.includes("index.md"));
  f.submit("follow-up"); const newWorker = new EffectWorker(f.engine, deps.providers);
  while (await newWorker.runNext()) { /* A normal continuation must not reattach the handoff. */ }
  assert.equal(starts.at(-1)?.run.instruction, "follow-up");
});

test("switch admission rejects active work, stale snapshots, unsupported settings and unprepared commands without changing provider", async (t) => {
  const { f, deps } = await transitionFixture(t);
  await assert.rejects(prepareProviderTransition({ ...command, providerChange: { expected: next, next: provider } }, deps), /provider changed/);
  await assert.rejects(prepareProviderTransition({ ...command, providerChange: { expected: provider, next: { ...next, model: "removed" } } }, deps), /available/);
  await assert.rejects(prepareProviderTransition({ ...command, action: "compact" }, deps), /Compaction/);
  assert.throws(() => f.engine.execute(command), /preparing the handoff/);
  const prepared = await prepareProviderTransition(command, deps); assert.ok(prepared);
  f.engine.recordContext("conversation", { usedTokens: 100, windowTokens: 1000, inputTokens: 90, cachedInputTokens: 0, outputTokens: 10 });
  assert.throws(() => f.engine.execute(command, { steerFollowUp: false, providerTransition: prepared }), /chat changed/);
  f.submit("competing");
  assert.throws(() => f.engine.execute(command, { steerFollowUp: false, providerTransition: prepared }), /Finish active work/);
  await assert.rejects(prepareProviderTransition(command, deps), /Finish active work/);
  assert.deepEqual(f.snapshot().conversation.provider, provider);
});

test("host retries a lost switch receipt without preparing another snapshot or starting another turn", async (t) => {
  const setup = await transitionFixture(t); const { f, deps, starts } = setup;
  const host = new ExecutionHost(deps); host.start();
  try {
    const completed = new Promise<void>((resolve, reject) => {
      const off = host.subscribe({ after: f.store.cursor(), onError: reject, onEvent: (event) => {
        if (event.payload.kind === "run" && event.payload.run.id === "next" && event.payload.run.state === "completed") { off(); resolve(); }
      } });
    });
    const receipt = await host.execute(command);
    await completed;
    assert.deepEqual(await host.execute(command), receipt);
    assert.equal(setup.writes, 1); assert.equal(starts.length, 1);
    const indexPath = starts[0].run.handoff?.reference.indexPath; assert.ok(indexPath);
    assert.match(await readFile(indexPath, "utf8"), /Referenced chat/);
  } finally { await host.shutdown(); }
});

test("provider switching waits for review effects and background tools that outlive a root turn", async (t) => {
  const { f, deps, worker } = await transitionFixture(t);
  f.submit("background");
  const run = f.snapshot().runs[1];
  f.engine.accept({ kind: "item", eventId: "background-tool", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    item: { id: "background-tool", runId: run.id, createdAt: run.createdAt, kind: "tool", label: "Background work", output: "", state: "running" } });
  await worker.runNext(["start"]);
  await assert.rejects(prepareProviderTransition(command, deps), /Finish active work/);
  while (await worker.runNext()) { /* Even after review is done, a live background tool still blocks the transition. */ }
  assert.equal(f.store.unfinishedEffects().length, 0);
  assert.equal(f.store.hasBackgroundActivity("conversation"), true);
  await assert.rejects(prepareProviderTransition(command, deps), /Finish active work/);
});

test("handoff survives a provider failure before native acceptance and is consumed by the next accepted turn", async (t) => {
  const { f, deps, worker, starts, replacement } = await transitionFixture(t);
  const start = replacement.start;
  replacement.start = async ({ run }, emit) => {
    emit({ kind: "finished", eventId: "not-submitted", conversationId: run.conversationId, runId: run.id, attemptId: run.attemptId,
      status: "failed", failure: { code: "authentication", message: "Sign in first", retryable: true }, usage: null });
  };
  const prepared = await prepareProviderTransition(command, deps); assert.ok(prepared);
  f.engine.execute(command, { steerFollowUp: false, providerTransition: prepared });
  while (await worker.runNext()) { /* Fail before binding a native turn. */ }
  assert.equal(f.snapshot().conversation.pendingHandoffRunId, "next");
  replacement.start = start;
  f.submit("retry-after-sign-in");
  f.command({ kind: "continue-queue", commandId: "resume", conversationId: "conversation" });
  while (await worker.runNext()) { /* The first accepted native turn still receives the saved history. */ }
  assert.match(starts[0].run.instruction, /preserve the public API/);
  assert.equal(f.snapshot().conversation.pendingHandoffRunId, undefined);
  f.submit("follow-up"); while (await worker.runNext()) { /* Subsequent turns reuse native history. */ }
  assert.equal(starts[1].run.instruction, "follow-up");
});
