import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { fixture } from "./fixture";

test("workspace review finalizes atomically after native completion without changing outcome or recency", async (t) => {
  const f = fixture(t); f.create(); f.submit(); f.submit("next");
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: { inputTokens: 4, outputTokens: 2 } });
  const completed = f.snapshot().runs[0]; const conversation = f.snapshot().conversation;
  assert.equal(completed.review, "pending"); assert.equal(f.snapshot().runs[1].state, "starting");
  f.setTime("2026-10-21T10:01:00.000Z");
  const worker = new EffectWorker(f.engine, new ProviderRegistry(), undefined, undefined,
    async () => ({ status: "ready", scope: "workspace", paths: ["pre-existing.md", "output.md"] }));
  assert.equal(await worker.runNext(["review"]), true);
  assert.deepEqual(f.snapshot().runs[0], { ...completed, review: "ready" });
  assert.deepEqual(f.snapshot().conversation, conversation);
  const item = f.snapshot().items.find((entry) => entry.kind === "review");
  assert.ok(item?.kind === "review"); assert.equal(item.createdAt, "2026-10-21T10:01:00.000Z");
  assert.deepEqual(item.result, { status: "ready", scope: "workspace", paths: ["pre-existing.md", "output.md"] });
  assert.equal(await worker.runNext(["review"]), false);
  assert.equal(f.snapshot().runs[1].state, "starting");
});

test("review failure is sanitized and cannot replace a failed native outcome or continue its paused queue", async (t) => {
  const f = fixture(t); f.create(); f.submit(); f.submit("next");
  f.update({ kind: "finished", eventId: "done", status: "failed", usage: null,
    failure: { code: "usage-limit", message: "Usage exhausted", retryable: true } });
  const completed = f.snapshot().runs[0];
  const worker = new EffectWorker(f.engine, new ProviderRegistry(), undefined, undefined,
    async () => { throw new Error("secret provider configuration"); });
  await worker.runNext(["review"]);
  assert.deepEqual(f.snapshot().runs[0], { ...completed, review: "unavailable" });
  assert.equal(f.snapshot().conversation.queuePaused, true); assert.equal(f.snapshot().runs[1].state, "queued");
  assert.equal(JSON.stringify(f.snapshot()).includes("secret"), false);
  const item = f.snapshot().items.find((entry) => entry.kind === "review");
  assert.ok(item?.kind === "review");
  assert.deepEqual(item.result, { status: "unavailable", reason: "workspace-unavailable" });
});

test("review publication, run projection and effect retirement roll back together; duplicate completion is harmless", (t) => {
  const f = fixture(t); f.create(); f.submit();
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  const effect = f.engine.claimEffect(["review"]); assert.ok(effect);
  const cursor = f.store.cursor();
  const database = new DatabaseSync(f.path);
  t.after(() => database.close());
  database.exec("CREATE TRIGGER reject_review BEFORE UPDATE ON effects BEGIN SELECT RAISE(ABORT, 'review failure'); END");
  const result = { status: "ready" as const, scope: "workspace" as const, paths: [] };
  assert.throws(() => f.engine.finishReview(effect.id, result), /review failure/);
  assert.equal(f.snapshot().runs[0].review, "pending"); assert.equal(f.store.cursor(), cursor);
  assert.equal(f.snapshot().items.some((entry) => entry.kind === "review"), false);
  assert.equal(f.store.effect(effect.id)?.status, "claimed");
  database.exec("DROP TRIGGER reject_review");
  f.engine.finishReview(effect.id, result);
  const finalCursor = f.store.cursor(); f.engine.finishReview(effect.id, result);
  assert.equal(f.store.cursor(), finalCursor);
  assert.equal(f.snapshot().items.filter((entry) => entry.kind === "review").length, 1);
  const saved = f.snapshot(); f.restart(); f.engine.recover(); assert.deepEqual(f.snapshot(), saved);
});

for (const claimed of [false, true]) {
  test(`restart marks ${claimed ? "claimed" : "pending"} review unavailable instead of inspecting a later workspace`, (t) => {
    const f = fixture(t); f.create(); f.submit();
    f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
    if (claimed) assert.ok(f.engine.claimEffect(["review"]));
    f.restart(); f.engine.recover();
    assert.equal(f.snapshot().runs[0].state, "completed"); assert.equal(f.snapshot().runs[0].review, "unavailable");
    const item = f.snapshot().items.find((entry) => entry.kind === "review");
    assert.ok(item?.kind === "review"); assert.deepEqual(item.result, { status: "unavailable", reason: "interrupted" });
    assert.equal(f.engine.claimEffect(["review"]), null);
    const cursor = f.store.cursor(); f.engine.recover(); assert.equal(f.store.cursor(), cursor);
  });
}

test("providers cannot fabricate host review evidence", (t) => {
  const f = fixture(t); f.create(); f.submit(); const run = f.snapshot().runs[0];
  assert.throws(() => f.engine.accept({ kind: "item", eventId: "fake", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    item: { kind: "review", id: "fake", runId: run.id, createdAt: run.createdAt,
      result: { status: "ready", scope: "workspace", paths: [] } } }), /belongs to the execution host/);
});

test("v3 upgrade preserves execution history and finalizes historical pending reviews as unavailable", (t) => {
  const f = fixture(t); f.create(); f.submit();
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  const database = new DatabaseSync(f.path);
  database.exec("DELETE FROM effects WHERE json_extract(json, '$.action.kind') = 'review'; PRAGMA user_version = 3");
  const before = f.snapshot(); const cursor = f.store.cursor();
  f.restart();
  assert.equal(database.prepare("PRAGMA user_version").get()?.user_version, 6);
  assert.deepEqual(f.snapshot(), before); assert.equal(f.store.cursor(), cursor);
  assert.equal(f.store.unfinishedEffects().filter((effect) => effect.action.kind === "review").length, 1);
  f.engine.recover();
  assert.deepEqual(f.snapshot().runs[0], { ...before.runs[0], review: "unavailable" });
  assert.equal(f.snapshot().conversation.nativeConversationId, before.conversation.nativeConversationId);
  assert.deepEqual(f.submit(), f.store.receipt(JSON.stringify(["command", "conversation", "submit-conversation-run"]))?.receipt);
  database.close();
});
