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
  // Simulated native outcome only: this smoke never opens a provider or sends an instruction.
  const run = restored.snapshot("conversation").runs[0];
  restored.accept({ kind: "finished", eventId: "smoke-outcome", conversationId: "conversation", runId: run.id,
    attemptId: run.attemptId, status: "completed", failure: null, usage: null });
  const review = restored.claimEffect(["review"]);
  assert.ok(review);
  restored.finishReview(review.id, { status: "ready", scope: "workspace", paths: [] });
  assert.equal(restored.snapshot("conversation").runs[0].review, "ready");
  assert.equal(restored.snapshot("conversation").runs[0].state, "completed");
  restored.execute({ kind: "submit", commandId: "checkpoint-submit", conversationId: "conversation", runId: "checkpoint-run", instruction: "Fixture only" });
  const start = restored.claimEffect(["start"]); assert.ok(start);
  const capture = { status: "ready", snapshot: { capturedAt: new Date().toISOString(), files: [
    { path: "note.md", mode: "100644", content: Buffer.from("Checkpoint contents").toString("base64") }
  ] } };
  restored.recordCheckpoint(start.id, "baseline", capture);
  restored.accept({ kind: "finished", eventId: "checkpoint-outcome", conversationId: "conversation", runId: "checkpoint-run",
    attemptId: start.attemptId, status: "completed", failure: null, usage: null });
  const pendingReview = restored.claimEffect(["review"]); assert.ok(pendingReview);
  restored.recordCheckpoint(pendingReview.id, "final", capture);
  ownership.release(); store.close(); store = undefined;
  store = new SqliteExecutionStore(database, "smoke-test");
  ownership = new ExecutionOwnership({ store, owner: { id: randomUUID(), processId: process.pid }, isProcessAlive });
  ownership.acquire();
  const resumed = new ConversationEngine({ store, now: () => new Date().toISOString(), nextId: randomUUID, assertOwnership: () => ownership.assertCurrent() });
  resumed.recover();
  assert.deepEqual(resumed.checkpoint("conversation", "checkpoint-run").baseline, capture);
  const resumedReview = resumed.claimEffect(["review"]); assert.ok(resumedReview);
  resumed.finishReview(resumedReview.id, { status: "ready", scope: "turn", attribution: "observed",
    baselineAt: capture.snapshot.capturedAt, capturedAt: capture.snapshot.capturedAt, changes: [] });
  assert.equal(resumed.snapshot("conversation").runs.at(-1).review, "ready");
  console.log(JSON.stringify({ sqlite: "writable/restart/recovery/review/checkpoints passed", node: process.versions.node, electron: process.versions.electron ?? null }));
} finally {
  ownership?.release();
  store?.close();
  rmSync(directory, { recursive: true, force: true });
}
