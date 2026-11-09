import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SqliteExecutionStore } = require("../dist/main/execution/sqliteStore.js");
const { ConversationEngine } = require("../dist/main/execution/engine.js");
const { ExecutionOwnership, isProcessAlive } = require("../dist/main/execution/ownership.js");
const directory = mkdtempSync(join(tmpdir(), "nora-sqlite-runtime-"));
const database = join(directory, "execution.sqlite");
let store;
let ownership;
try {
  store = new SqliteExecutionStore(database, "smoke-test");
  ownership = new ExecutionOwnership({ store, owner: { id: randomUUID(), processId: process.pid }, isProcessAlive });
  ownership.acquire();
  const engine = new ConversationEngine({ store, now: () => new Date().toISOString(), nextId: randomUUID, assertOwnership: () => ownership.assertCurrent() });
  engine.execute({ kind: "create", commandId: "create", conversationId: "conversation", title: "Runtime smoke", parentId: null,
    provider: { kind: "codex", instanceId: "smoke", model: "not-invoked", reasoning: null, permissionPolicy: "native-default" },
    workspace: { projectId: "smoke", environmentId: "smoke-test", checkoutId: "smoke", path: directory, branch: "main", access: "read" } });
  const command = { kind: "submit", commandId: "submit", conversationId: "conversation", runId: "run", instruction: "No provider is invoked" };
  const receipt = engine.execute(command);
  engine.claimEffect();
  ownership.release(); store.close(); store = undefined;
  store = new SqliteExecutionStore(database, "smoke-test");
  ownership = new ExecutionOwnership({ store, owner: { id: randomUUID(), processId: process.pid }, isProcessAlive });
  ownership.acquire();
  const restored = new ConversationEngine({ store, now: () => new Date().toISOString(), nextId: randomUUID, assertOwnership: () => ownership.assertCurrent() });
  assert.deepEqual(restored.execute(command), receipt);
  restored.recover();
  assert.equal(restored.snapshot("conversation").runs[0].state, "recovering");
  assert.equal(store.effects().filter((effect) => effect.status === "pending")[0].action.kind, "reconcile");
  console.log(JSON.stringify({ sqlite: "writable/restart/recovery passed", node: process.versions.node, electron: process.versions.electron ?? null }));
} finally {
  ownership?.release();
  store?.close();
  rmSync(directory, { recursive: true, force: true });
}
