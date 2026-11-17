import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { compareSnapshots } from "@main/execution/checkpoints/diff";
import type { ExecutionProvider } from "@main/types/execution/provider.types";
import type { TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import { fixture } from "../fixture";
import { snapshot } from "./fixture";

function registry(start: ExecutionProvider["start"]): ProviderRegistry {
  const providers = new ProviderRegistry();
  providers.register({ kind: "codex", instanceId: "account-a", capabilities: nativeCapabilities, start,
    async catalog() { return { status: "unavailable", failure: { code: "unsupported", message: "Fixture", retryable: false } }; },
    async interrupt() {}, async respond() {}, async reconcile() {}, async close() {} });
  return providers;
}

test("baseline commits before native start; queued turns wait for final capture and inherit the previous result", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  let current = snapshot({ "document.md": "Pre-existing edit\n" }); let starts = 0;
  const checkpoints: TurnCheckpoints = { async capture() { return { status: "ready", snapshot: current }; },
    compare: (before, after) => compareSnapshots("git", before, after) };
  const providers = registry(async ({ run }, emit) => {
    const saved = f.store.checkpoint("conversation", run.id); assert.ok(saved?.baseline.status === "ready");
    assert.deepEqual(saved.baseline.snapshot, current);
    current = snapshot({ "document.md": `Pre-existing edit\nTurn ${++starts}\n` }, `2026-11-09T10:0${starts}:00.000Z`);
    emit({ kind: "started", eventId: "started", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
      nativeConversationId: "thread", nativeTurnId: run.id });
    emit({ kind: "finished", eventId: "done", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
      status: "completed", failure: null, usage: null });
  });
  const worker = new EffectWorker(f.engine, providers, undefined, undefined, undefined, checkpoints);
  await worker.runNext(["start"]); f.submit("next");
  assert.equal(f.snapshot().runs[0].state, "completed"); assert.equal(f.snapshot().runs[0].review, "pending");
  assert.equal(await worker.runNext(["start"]), false); assert.equal(starts, 1);
  await worker.runNext(["review"]);
  const first = f.snapshot().items.find((item) => item.kind === "review"); assert.ok(first?.kind === "review");
  assert.ok(first.result.status === "ready" && first.result.scope === "turn");
  assert.ok(first.result.changes[0].patch?.includes("+Turn 1")); assert.equal(first.result.attribution, "observed");
  await worker.runNext(["start"]); assert.equal(starts, 2);
  const secondBaseline = f.store.checkpoint("conversation", "next"); assert.ok(secondBaseline?.baseline.status === "ready");
  assert.equal(Buffer.from(secondBaseline.baseline.snapshot.files[0].content, "base64").toString(), "Pre-existing edit\nTurn 1\n");
  await worker.runNext(["review"]);
  const second = f.snapshot().items.find((item) => item.kind === "review" && item.runId === "next");
  assert.ok(second?.kind === "review" && second.result.status === "ready" && second.result.scope === "turn");
  assert.ok(second.result.changes[0].patch?.includes("-Turn 1\n+Turn 2"));
});

test("pending turn evidence retains checkout writer admission, while unrelated checkouts continue", (t) => {
  const f = fixture(t); f.create(); f.create("same", "conversation"); f.create("isolated"); f.submit();
  const start = f.engine.claimEffect(["start"]); assert.ok(start);
  f.engine.recordCheckpoint(start.id, "baseline", { status: "ready", snapshot: snapshot({ "note.md": "Before\n" }) });
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  assert.deepEqual(f.store.writers(f.snapshot().conversation.workspace), ["conversation"]);
  assert.throws(() => f.submit("other", "same"), /isolated worktree/);
  f.submit("parallel", "isolated");
  assert.equal(f.engine.claimEffect(["start"])?.conversationId, "isolated");
});

test("capture failure falls back to workspace scope without claiming turn attribution or changing native completion", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const providers = registry(async ({ run }, emit) => {
    emit({ kind: "finished", eventId: "done", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
      status: "completed", failure: null, usage: null });
  });
  const worker = new EffectWorker(f.engine, providers, undefined, undefined,
    async () => ({ status: "ready", scope: "workspace", paths: ["note.md"] }),
    { async capture() { return { status: "unavailable", reason: "limit-exceeded" }; }, async compare() { assert.fail("No complete pair exists"); } });
  await worker.runNext(["start"]); await worker.runNext(["review"]);
  const review = f.snapshot().items.find((item) => item.kind === "review"); assert.ok(review?.kind === "review");
  assert.deepEqual(review.result, { status: "ready", scope: "workspace", paths: ["note.md"], attributionUnavailable: "limit-exceeded" });
  assert.equal(f.snapshot().runs[0].state, "completed");
});

test("cancelling during baseline capture never submits the instruction", async (t) => {
  const f = fixture(t); f.create(); f.submit(); let starts = 0;
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const worker = new EffectWorker(f.engine, registry(async () => { starts++; }), undefined, undefined, undefined,
    { async capture() { await gate; return { status: "ready", snapshot: snapshot({}) }; }, async compare() { assert.fail("No turn started"); } });
  const operation = worker.beginNextEffect(["start"]); assert.ok(operation);
  f.command({ kind: "interrupt", commandId: "stop", conversationId: "conversation", runId: "run" });
  release(); await operation;
  assert.equal(starts, 0); assert.equal(f.snapshot().runs[0].state, "interrupted");
  assert.equal(f.store.checkpoint("conversation", "run"), null);
});

test("checkpoint transaction failure prevents provider submission and preserves the unsent evidence boundary", async (t) => {
  const f = fixture(t); f.create(); f.submit(); let starts = 0;
  const database = new DatabaseSync(f.path); t.after(() => database.close());
  database.exec("CREATE TRIGGER reject_checkpoint BEFORE INSERT ON turn_checkpoints BEGIN SELECT RAISE(ABORT, 'checkpoint failure'); END");
  const worker = new EffectWorker(f.engine, registry(async () => { starts++; }), undefined, undefined, undefined,
    { async capture() { return { status: "ready", snapshot: snapshot({}) }; }, async compare() { assert.fail("No turn started"); } });
  await assert.rejects(worker.runNext(["start"]), /checkpoint failure/);
  assert.equal(starts, 0); assert.equal(f.store.checkpoint("conversation", "run"), null);
  assert.equal(database.prepare("SELECT count(*) AS count FROM checkpoint_blobs").get()?.count, 0);
});

test("restart with a saved pair rebuilds review from durable bytes without re-reading or resending", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const start = f.engine.claimEffect(["start"]); assert.ok(start);
  f.engine.recordCheckpoint(start.id, "baseline", { status: "ready", snapshot: snapshot({ "note.md": "Before\n" }) });
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  const review = f.engine.claimEffect(["review"]); assert.ok(review);
  f.engine.recordCheckpoint(review.id, "final", { status: "ready", snapshot: snapshot({ "note.md": "After\n" }, "2026-11-09T10:01:00.000Z") });
  const saved = f.store.checkpoint("conversation", "run");
  f.restart(); f.engine.recover();
  assert.deepEqual(f.store.checkpoint("conversation", "run"), saved);
  const worker = new EffectWorker(f.engine, new ProviderRegistry(), undefined, undefined,
    async () => { assert.fail("Do not inspect the current workspace"); },
    { async capture() { assert.fail("Do not recapture after restart"); }, compare: (before, after) => compareSnapshots("git", before, after) });
  await worker.runNext(["review"]);
  const item = f.snapshot().items.find((entry) => entry.kind === "review");
  assert.ok(item?.kind === "review" && item.result.status === "ready" && item.result.scope === "turn");
  assert.ok(item.result.changes[0].patch?.includes("-Before\n+After"));
  assert.equal(f.snapshot().runs[0].state, "completed");
  const cursor = f.store.cursor(); f.restart(); f.engine.recover(); assert.equal(f.store.cursor(), cursor);
});

for (const loss of ["restart", "disconnect"] as const) {
  test(`${loss} during a native turn invalidates continuous attribution without deleting the baseline`, async (t) => {
    const f = fixture(t); f.create(); f.submit();
    const start = f.engine.claimEffect(["start"]); assert.ok(start);
    const baseline = { status: "ready" as const, snapshot: snapshot({ "note.md": "Before\n" }) };
    f.engine.recordCheckpoint(start.id, "baseline", baseline);
    if (loss === "restart") { f.restart(); f.engine.recover(); }
    else {
      const run = f.snapshot().runs[0];
      f.engine.accept({ kind: "disconnected", eventId: "lost", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
        failure: { code: "disconnected", message: "Disconnected", retryable: false } });
    }
    assert.deepEqual(f.store.checkpoint("conversation", "run")?.baseline, baseline);
    assert.equal(f.store.checkpoint("conversation", "run")?.continuity, "interrupted");
    f.update({ kind: "finished", eventId: "confirmed", status: "completed", failure: null, usage: null });
    const worker = new EffectWorker(f.engine, new ProviderRegistry(), undefined, undefined,
      async () => ({ status: "ready", scope: "workspace", paths: ["later.md"] }),
      { async capture() { assert.fail("A later capture cannot recover the original turn boundary"); }, async compare() { assert.fail("No continuous evidence"); } });
    await worker.runNext(["review"]);
    const item = f.snapshot().items.find((entry) => entry.kind === "review"); assert.ok(item?.kind === "review");
    assert.deepEqual(item.result, { status: "ready", scope: "workspace", paths: ["later.md"], attributionUnavailable: "interrupted" });
  });
}

test("restart before final capture records unavailable evidence instead of examining later files", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const start = f.engine.claimEffect(["start"]); assert.ok(start);
  const baseline = { status: "ready" as const, snapshot: snapshot({ "note.md": "Before\n" }) };
  f.engine.recordCheckpoint(start.id, "baseline", baseline);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  f.restart(); f.engine.recover();
  assert.equal(f.snapshot().runs[0].review, "unavailable");
  assert.deepEqual(f.store.checkpoint("conversation", "run")?.baseline, baseline);
  assert.deepEqual(f.store.checkpoint("conversation", "run")?.final, { status: "unavailable", reason: "interrupted" });
  assert.equal(f.engine.claimEffect(["review"]), null);
});
