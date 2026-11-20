import assert from "node:assert/strict";
import test from "node:test";
import { fixture, provider } from "./fixture";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { IdleSettlement } from "@main/execution/idleSettlement";
import { expiredWorkerStartup } from "@main/execution/workerStartup";

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

test("abandoned workers settle after a startup grace even when completed settlement is disabled", (t) => {
  const f = fixture(t);
  const createWorker = (id: string) => f.command({ kind: "create", commandId: `create-${id}`, conversationId: id, title: id,
    parentId: null, source: { kind: "worker" }, provider,
    workspace: { environmentId: "local", projectId: "project", checkoutId: id, path: `/test/${id}`, branch: "main", access: "read" } });
  createWorker("empty"); createWorker("active"); createWorker("paused"); f.create("ordinary");
  f.submit("work", "active"); f.submit("queued", "active");
  let now = "2026-10-21T10:01:59.000Z";
  const idle = new IdleSettlement({ store: f.store, days: () => null, now: () => now,
    dispatch: (command) => { f.command(command); }, onError: () => assert.fail("maintenance failed") });
  idle.tick(); assert.equal(f.snapshot("empty").conversation.archivedAt, null);
  now = "2026-10-21T10:02:00.000Z"; f.setTime(now);
  assert.equal(expiredWorkerStartup(f.store, { ...f.snapshot("paused").conversation, queuePaused: true }, now), false);
  idle.tick(); assert.equal(f.snapshot("empty").conversation.archivedAt, now);
  for (const id of ["active", "ordinary"]) assert.equal(f.snapshot(id).conversation.archivedAt, null, id);
  f.command({ kind: "unarchive", commandId: "reopen-empty", conversationId: "empty" });
  idle.tick(); assert.equal(f.snapshot("empty").conversation.archivedAt, null);
  now = "2026-10-21T10:04:00.000Z"; f.setTime(now);
  idle.tick(); assert.equal(f.snapshot("empty").conversation.archivedAt, now);
  idle.close();
});
