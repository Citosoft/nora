import assert from "node:assert/strict";
import test from "node:test";
import { IdleCompaction } from "@main/execution/idleCompaction";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { cacheCompactionAdvice } from "@shared/conversations/compaction";
import type { IdleCompactionMode } from "@shared/types/personalization/compaction.types";
import { fixture, provider } from "./fixture";
import { ProviderDouble } from "./providerDouble";

test("a delayed or disabled automatic compaction is skipped without sending a native prompt or pausing the queue", async (t) => {
  for (const mode of ["off", "before-expiry"] as const) {
    const f = fixture(t); f.create();
    f.command({ kind: "submit", commandId: "compact", conversationId: "conversation", runId: "compact",
      instruction: "Automatic compaction", action: "compact", compactionDeadline: "2026-11-12T10:04:30.000Z" });
    f.submit("next");
    const provider = new ProviderDouble(); const providers = new ProviderRegistry(); providers.register(provider);
    await new EffectWorker(f.engine, providers, undefined, undefined, undefined, undefined,
      { idleCompactionMode: () => mode, now: () => "2026-11-12T10:05:00.000Z" }).runNext(["start"]);
    assert.equal(provider.starts, 0);
    assert.equal(f.snapshot().conversation.queuePaused, false);
    assert.equal(f.snapshot().runs[1].state, "starting");
    assert.ok(f.snapshot().items.some((item) => item.kind === "milestone" && item.text.startsWith("Skipped automatic compaction")));
  }
});

const context = { usedTokens: 220_000, windowTokens: 1_000_000, inputTokens: 219_000, outputTokens: 1_000,
  cachedInputTokens: 200_000, updatedAt: "2026-11-12T10:00:00.000Z", promptCacheExpiresAt: "2026-11-12T10:05:00.000Z" };

test("compaction advice requires a large context and a known expiry, and distinguishes warm and cold windows", () => {
  assert.equal(cacheCompactionAdvice(context, Date.parse("2026-11-12T10:02:59Z")), "none");
  assert.equal(cacheCompactionAdvice(context, Date.parse("2026-11-12T10:03:00Z")), "expiring");
  assert.equal(cacheCompactionAdvice(context, Date.parse("2026-11-12T10:05:00Z")), "expired");
  for (const value of [undefined, null, { ...context, promptCacheExpiresAt: undefined }, { ...context, usedTokens: 199_999 }]) {
    assert.equal(cacheCompactionAdvice(value, Date.parse("2026-11-12T10:04:00Z")), "none");
  }
});

test("idle compaction is opt-in, durable, at most once, and never runs after expiry", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" }); f.submit();
  const attemptId = f.snapshot().runs[0].attemptId;
  f.update({ kind: "started", eventId: "started", nativeConversationId: "native", nativeTurnId: "turn" });
  f.engine.accept({ kind: "context", eventId: "usage", conversationId: "conversation", runId: "run", attemptId, context });
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  const providers = new ProviderRegistry();
  providers.register({ kind: "claude", instanceId: "account-a", capabilities: { ...nativeCapabilities, compaction: true },
    async close() {}, async start() {}, async interrupt() {}, async respond() {}, async reconcile() {},
    async catalog() { return { status: "unavailable", failure: { code: "unsupported", message: "test", retryable: false } }; } });
  let mode: IdleCompactionMode = "suggest";
  let now = "2026-11-12T10:04:00.000Z";
  const idle = new IdleCompaction({ store: f.store, providers, mode: () => mode, now: () => now,
    dispatch: (command) => { f.command(command); }, onError: () => assert.fail("scheduler failed") });
  idle.tick(); assert.equal(f.snapshot().runs.length, 1);
  mode = "before-expiry";
  idle.tick(); assert.equal(f.snapshot().runs.length, 1, "pending review prevents compaction");
  await new EffectWorker(f.engine, providers).runNext(["review"]);
  now = "2026-11-12T10:05:00.000Z";
  idle.tick(); assert.equal(f.snapshot().runs.length, 1, "a cold read is not started automatically");
  now = "2026-11-12T10:04:00.000Z";
  idle.tick(); idle.tick();
  const run = f.snapshot().runs[1];
  assert.equal(f.snapshot().runs.length, 2); assert.equal(run.action, "compact");
  assert.equal(run.state, "starting");
  assert.equal(f.snapshot().items.at(-1)?.kind, "milestone", "background compaction is visible in the transcript");
  f.update({ kind: "finished", eventId: "compacted", status: "completed", failure: null, usage: null }, run.id);
  await new EffectWorker(f.engine, providers).runNext(["review"]);
  idle.tick(); assert.equal(f.snapshot().runs.length, 2, "compaction never compacts itself");
  idle.close();
});

test("active work, approvals, paused queues, settled threads and older background agents prevent idle compaction", async (t) => {
  const f = fixture(t); f.create("conversation", "checkout", { ...provider, kind: "claude" }); f.submit();
  const attemptId = f.snapshot().runs[0].attemptId;
  f.update({ kind: "started", eventId: "start", nativeConversationId: "native", nativeTurnId: "turn" });
  f.engine.accept({ kind: "context", eventId: "usage", conversationId: "conversation", runId: "run", attemptId, context });
  let sends = 0;
  const idle = new IdleCompaction({ store: f.store, mode: () => "before-expiry", now: () => "2026-11-12T10:04:00.000Z",
    providers: { resolve() { throw new Error("ineligible work must not resolve a provider"); } },
    dispatch: () => { sends++; }, onError: () => assert.fail("scheduler failed") });
  idle.tick(); assert.equal(sends, 0);
  f.engine.accept({ kind: "request", eventId: "approval", conversationId: "conversation", runId: "run", attemptId,
    request: { kind: "approval", id: "approval", nativeId: "approval", runId: "run", attemptId, title: "Allow?", status: "pending",
      createdAt: context.updatedAt, expiresAt: "2026-11-12T11:00:00Z", options: [{ id: "allow", label: "Allow" }] } });
  idle.tick(); assert.equal(sends, 0);
  f.engine.accept({ kind: "item", eventId: "background", conversationId: "conversation", runId: "run", attemptId,
    item: { kind: "subagent", id: "background", runId: "run", nativeId: "child", label: "Child", state: "running", createdAt: context.updatedAt } });
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  await new EffectWorker(f.engine, new ProviderRegistry()).runNext(["review"]);
  assert.equal(f.store.hasBackgroundActivity("conversation"), true);
  idle.tick(); assert.equal(sends, 0);
  f.command({ kind: "archive", commandId: "settle", conversationId: "conversation" });
  idle.tick(); assert.equal(sends, 0);
  idle.close();
});
