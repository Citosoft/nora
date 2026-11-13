import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./fixture";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { IdleSettlement } from "@main/execution/idleSettlement";

test("idle settlement is opt-in, waits for completed work and review, and reopening resets the idle period", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  let days: number | null = null;
  let now = "2026-11-12T10:00:00.000Z";
  const idle = new IdleSettlement({ store: f.store, days: () => days, now: () => now,
    dispatch: (command) => { f.command(command); }, onError: () => assert.fail("maintenance failed") });
  idle.tick(); assert.equal(f.snapshot().conversation.archivedAt, null);
  days = 7;
  idle.tick(); assert.equal(f.snapshot().conversation.archivedAt, null, "active work cannot settle");
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  idle.tick(); assert.equal(f.snapshot().conversation.archivedAt, null, "review must finish first");
  await new EffectWorker(f.engine, new ProviderRegistry()).runNext(["review"]);
  f.setTime(now);
  idle.tick(); assert.equal(f.snapshot().conversation.archivedAt, now);
  f.command({ kind: "unarchive", commandId: "reopen", conversationId: "conversation" });
  idle.tick(); assert.equal(f.snapshot().conversation.archivedAt, null, "reopened threads get a fresh idle period");
  now = "2026-11-20T10:00:00.000Z"; f.setTime(now);
  idle.tick(); assert.equal(f.snapshot().conversation.archivedAt, now);
  idle.close();
});

test("queued instructions and unsuccessful turns stay out of automatic settlement", async (t) => {
  const f = fixture(t); f.create(); f.submit(); f.submit("queued");
  const idle = new IdleSettlement({ store: f.store, days: () => 1, now: () => "2026-11-12T10:00:00.000Z",
    dispatch: () => assert.fail("pending work cannot settle"), onError: () => assert.fail("maintenance failed") });
  idle.tick();
  f.update({ kind: "finished", eventId: "failed", status: "failed", failure: { code: "provider", message: "Retry required", retryable: true }, usage: null });
  await new EffectWorker(f.engine, new ProviderRegistry()).runNext(["review"]);
  idle.tick();
  assert.equal(f.snapshot().conversation.archivedAt, null);
  idle.close();
});
