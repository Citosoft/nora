import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fixture } from "../fixture";
import { snapshot } from "./fixture";

test("checkpoint bytes are deduplicated across files and captures, verified on read, and kept out of manifests/events", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const start = f.engine.claimEffect(["start"]); assert.ok(start);
  const baseline = { status: "ready" as const, snapshot: snapshot({ "one.md": "Private file contents\n", "two.md": "Private file contents\n" }) };
  f.engine.recordCheckpoint(start.id, "baseline", baseline);
  assert.throws(() => f.engine.recordCheckpoint(start.id, "baseline", baseline), /already exists/);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  const review = f.engine.claimEffect(["review"]); assert.ok(review);
  assert.throws(() => f.engine.finishEffect(review.id), /must be finalized/);
  f.engine.recordCheckpoint(review.id, "final", baseline);
  const database = new DatabaseSync(f.path); t.after(() => database.close());
  assert.equal(database.prepare("SELECT count(*) AS count FROM checkpoint_blobs").get()?.count, 1);
  const manifest = database.prepare("SELECT json FROM turn_checkpoints").get()?.json;
  assert.equal(typeof manifest, "string"); assert.equal(String(manifest).includes("content"), false);
  assert.equal(JSON.stringify(f.store.events(0, 200)).includes("Private file contents"), false);
  f.restart(); assert.deepEqual(f.store.checkpoint("conversation", "run")?.baseline, baseline);
  database.prepare("UPDATE checkpoint_blobs SET content = ?").run(Buffer.from("Corrupted"));
  assert.throws(() => f.store.checkpoint("conversation", "run"), /integrity/);
});

test("live token updates and checkout admission do not hydrate saved file contents", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const start = f.engine.claimEffect(["start"]); assert.ok(start);
  f.engine.recordCheckpoint(start.id, "baseline", { status: "ready", snapshot: snapshot({ "note.md": "Before\n" }) });
  const original = f.store.checkpoint.bind(f.store);
  f.store.checkpoint = () => { throw new Error("File contents must not be loaded on this path"); };
  const run = f.snapshot().runs[0];
  f.engine.accept({ kind: "item", eventId: "token", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    item: { kind: "message", id: "assistant", runId: run.id, createdAt: run.createdAt, role: "assistant", text: "Streaming", complete: false } });
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  f.submit("next");
  assert.equal(f.engine.claimEffect(["start"]), null);
  assert.deepEqual(f.store.writers(f.snapshot().conversation.workspace), ["conversation"]);
  f.store.checkpoint = original;
});

test("schema v4 upgrades preserve history/receipts and create empty private checkpoint storage", (t) => {
  const f = fixture(t); f.create(); const receipt = f.submit(); const before = f.snapshot();
  const events = f.store.events(0, 200); f.store.close();
  const database = new DatabaseSync(f.path); t.after(() => database.close());
  database.exec("DROP TABLE turn_checkpoints; DROP TABLE checkpoint_blobs; PRAGMA user_version = 4");
  f.restart();
  assert.equal(database.prepare("PRAGMA user_version").get()?.user_version, 6);
  assert.deepEqual(f.snapshot(), before); assert.deepEqual(f.submit(), receipt); assert.deepEqual(f.store.events(0, 200), events);
  assert.equal(f.store.checkpoint("conversation", "run"), null);
  assert.equal(database.prepare("SELECT count(*) AS count FROM checkpoint_blobs").get()?.count, 0);
});

test("failed final capture persistence rolls back new blobs and leaves native outcome and baseline intact", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const start = f.engine.claimEffect(["start"]); assert.ok(start);
  f.engine.recordCheckpoint(start.id, "baseline", { status: "ready", snapshot: snapshot({ "note.md": "Before\n" }) });
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  const review = f.engine.claimEffect(["review"]); assert.ok(review);
  const saved = f.store.checkpoint("conversation", "run");
  const database = new DatabaseSync(f.path); t.after(() => database.close());
  database.exec("CREATE TRIGGER reject_final BEFORE UPDATE ON turn_checkpoints BEGIN SELECT RAISE(ABORT, 'final capture failure'); END");
  assert.throws(() => f.engine.recordCheckpoint(review.id, "final", { status: "ready", snapshot: snapshot({ "note.md": "After\n" }) }), /final capture failure/);
  assert.deepEqual(f.store.checkpoint("conversation", "run"), saved);
  assert.equal(database.prepare("SELECT count(*) AS count FROM checkpoint_blobs").get()?.count, 1);
  assert.equal(f.snapshot().runs[0].state, "completed"); assert.equal(f.snapshot().runs[0].review, "pending");
});
