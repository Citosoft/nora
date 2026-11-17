import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { ExecutionOwnership } from "@main/execution/ownership";
import { ConversationEngine } from "@main/execution/engine";
import { randomUUID } from "node:crypto";
import { fixture } from "./fixture";

test("a live environment owner prevents concurrent recovery and stale owners can be replaced", (t) => {
  const f = fixture(t);
  const first = new ExecutionOwnership({ store: f.store, owner: { id: "first", processId: 1 }, isProcessAlive: () => true });
  const second = new ExecutionOwnership({ store: f.store, owner: { id: "second", processId: 2 }, isProcessAlive: () => true });
  first.acquire(); first.acquire();
  assert.throws(() => second.acquire(), /live owner/);
  const recovered = new ExecutionOwnership({ store: f.store, owner: { id: "new-owner", processId: 3 }, isProcessAlive: () => false });
  recovered.acquire();
  assert.throws(() => first.assertCurrent(), /does not own/);
  assert.throws(() => first.release(), /changed before release/);
  recovered.release(); second.acquire(); second.assertCurrent(); second.release();
});

test("ownership acquisition is compared atomically after liveness inspection", (t) => {
  const f = fixture(t);
  f.store.claimOwnership({ id: "old", processId: 1 }, null);
  const racing = new ExecutionOwnership({ store: f.store, owner: { id: "racer", processId: 2 }, isProcessAlive() {
    f.store.claimOwnership({ id: "winner", processId: 3 }, "old"); return false;
  } });
  assert.throws(() => racing.acquire(), /changed while reconnecting/);
  assert.equal(f.store.ownership()?.id, "winner");
});

test("schema version one upgrades transactionally without losing conversations or command receipts", (t) => {
  const f = fixture(t); f.create(); const receipt = f.submit();
  const snapshot = f.snapshot();
  const database = new DatabaseSync(f.path);
  database.exec(`DROP TABLE conversation_requests; DROP TABLE conversation_items; DROP TABLE conversation_runs;
    DROP TABLE conversation_heads; DROP INDEX unfinished_effects; CREATE TABLE conversations (id TEXT PRIMARY KEY, json TEXT NOT NULL);
    DROP TABLE execution_lease; PRAGMA user_version = 1`);
  database.prepare("INSERT INTO conversations VALUES (?, ?)").run(snapshot.conversation.id, JSON.stringify(snapshot));
  database.close();
  f.restart();
  assert.deepEqual(f.submit(), receipt);
  assert.equal(f.snapshot().runs[0].state, "starting");
  assert.equal(f.store.ownership(), null);
  assert.equal(f.store.claimOwnership({ id: "after-upgrade", processId: 123 }, null), true);
});

test("engine mutations require the injected execution ownership guard", (t) => {
  const f = fixture(t);
  const ownership = new ExecutionOwnership({ store: f.store, owner: { id: "host", processId: 1 }, isProcessAlive: () => true });
  const engine = new ConversationEngine({ store: f.store, now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID,
    assertOwnership: () => ownership.assertCurrent() });
  assert.throws(() => engine.recover(), /does not own/);
  assert.throws(() => engine.claimEffect(), /does not own/);
  ownership.acquire();
  engine.recover();
  assert.equal(engine.claimEffect(), null);
  ownership.release();
  assert.throws(() => engine.expireRequests(), /does not own/);
});
