import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./fixture";

test("settling and reopening preserve transcript, native context, last activity and completed work across restart", (t) => {
  const f = fixture(t); f.create(); f.submit();
  f.update({ kind: "started", eventId: "started", nativeConversationId: "native-thread", nativeTurnId: "native-turn" });
  f.update({ kind: "finished", eventId: "finished", status: "completed", usage: null, failure: null });
  const before = f.snapshot(); const effects = f.store.effects();
  f.setTime("2026-11-11T12:00:00.000Z");
  const receipt = f.command({ kind: "archive", commandId: "settle", conversationId: "conversation" });
  assert.equal(f.snapshot().conversation.archivedAt, "2026-11-11T12:00:00.000Z");
  assert.equal(f.snapshot().conversation.updatedAt, before.conversation.updatedAt);
  assert.deepEqual(f.snapshot().items, before.items); assert.deepEqual(f.snapshot().runs, before.runs);
  assert.deepEqual(f.store.effects(), effects);
  f.restart();
  assert.deepEqual(f.command({ kind: "archive", commandId: "settle", conversationId: "conversation" }), receipt);
  assert.throws(() => f.submit("blocked"), /settled.*Reopen/);
  f.command({ kind: "unarchive", commandId: "reopen", conversationId: "conversation" });
  const restored = f.snapshot(); assert.equal(restored.conversation.archivedAt, null);
  assert.equal(restored.conversation.nativeConversationId, "native-thread");
  assert.equal(restored.conversation.updatedAt, before.conversation.updatedAt);
  assert.deepEqual(restored.runs, before.runs); assert.deepEqual(restored.items, before.items);
  assert.deepEqual(f.store.effects(), effects);
  f.restart(); assert.equal(f.snapshot().conversation.archivedAt, null);
  f.submit("continue"); assert.equal(f.snapshot().runs.find((run) => run.id === "continue")?.state, "starting");
});

test("settle and reopen are idempotent and cannot hide active or queued work", (t) => {
  const f = fixture(t); f.create();
  f.command({ kind: "archive", commandId: "settle", conversationId: "conversation" });
  const cursor = f.store.cursor();
  f.command({ kind: "archive", commandId: "settle-again", conversationId: "conversation" });
  assert.equal(f.store.cursor(), cursor);
  f.command({ kind: "unarchive", commandId: "restore", conversationId: "conversation" });
  const restoredCursor = f.store.cursor();
  f.command({ kind: "unarchive", commandId: "restore-again", conversationId: "conversation" });
  assert.equal(f.store.cursor(), restoredCursor);
  f.submit(); f.submit("queued");
  assert.throws(() => f.command({ kind: "archive", commandId: "busy", conversationId: "conversation" }), /Stop active work/);
  assert.equal(f.snapshot().conversation.archivedAt, null);
  assert.equal(f.snapshot().runs.find((run) => run.id === "queued")?.state, "queued");
});
