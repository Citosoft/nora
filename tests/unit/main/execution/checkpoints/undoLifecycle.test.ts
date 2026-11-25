import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test, { type TestContext } from "node:test";
import { EffectWorker } from "@main/execution/effectWorker";
import { compareSnapshots } from "@main/execution/checkpoints/diff";
import { retainedTurnCheckpoints } from "@main/execution/checkpoints/retention";
import type { RestoreOutcome, RestoreTarget, TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import type { TurnUndoMode } from "@shared/types/conversation/turnUndo.types";
import { fixture } from "../fixture";
import { registry, snapshot } from "./fixture";

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

function harness(t: TestContext) {
  const f = fixture(t); f.create();
  let current = snapshot({ "document.md": "Before\n" });
  let turns = 0;
  const restores: { targets: RestoreTarget[]; mode: TurnUndoMode }[] = [];
  let outcome = (targets: readonly RestoreTarget[], mode: TurnUndoMode): RestoreOutcome =>
    ({ status: "undone", mode, restored: targets.map((target) => target.path), skipped: [] });
  const checkpoints: TurnCheckpoints = {
    async capture() { return { status: "ready", snapshot: current }; },
    compare: (_workspace, before, after) => compareSnapshots("git", ".", before, after),
    async read() { return null; },
    async restore(_workspace, targets, mode) { restores.push({ targets: [...targets], mode }); return outcome(targets, mode); }
  };
  const providers = registry(async ({ run }, emit) => {
    turns++;
    current = snapshot({ "document.md": `Before\nTurn ${turns}\n` }, `2026-11-09T10:${String(turns).padStart(2, "0")}:00.000Z`);
    emit({ kind: "started", eventId: "started", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
      nativeConversationId: "thread", nativeTurnId: run.id });
    emit({ kind: "finished", eventId: "done", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
      status: "completed", failure: null, usage: null });
  });
  const worker = () => new EffectWorker(f.engine, providers, undefined, undefined, undefined, checkpoints);
  return {
    f, restores, worker,
    setOutcome(next: typeof outcome) { outcome = next; },
    async turn(runId: string) { f.submit(runId); await worker().runNext(["start"]); await worker().runNext(["review"]); },
    undo: (runId: string, mode: TurnUndoMode = "all", commandId = `undo-${runId}`) =>
      f.command({ kind: "undo-turn", commandId, conversationId: "conversation", runId, mode }),
    review(runId: string) {
      const item = f.snapshot().items.find((entry) => entry.kind === "review" && entry.runId === runId);
      assert.ok(item?.kind === "review");
      return item;
    }
  };
}

test("undo restores a reviewed turn's pre-turn bytes, holds the checkout meanwhile and records the outcome", async (t) => {
  const h = harness(t);
  await h.turn("run");
  h.undo("run");
  const pending = h.review("run").undo;
  assert.ok(pending?.status === "pending" && pending.mode === "all");
  h.f.submit("next");
  assert.equal(await h.worker().runNext(["start"]), false, "a new turn waits while the undo holds the checkout");
  assert.equal(await h.worker().runNext(["undo"]), true);
  assert.deepEqual(h.restores.map(({ targets, mode }) => [mode, targets.map((target) => ({ ...target, before: target.before && { ...target.before, content: target.before.content?.toString() } }))]),
    [["all", [{ path: "document.md", after: { hash: sha256("Before\nTurn 1\n"), mode: "100644" },
      before: { hash: sha256("Before\n"), mode: "100644", content: "Before\n" } }]]]);
  const undone = h.review("run").undo;
  assert.ok(undone?.status === "undone");
  assert.deepEqual(undone.restored, ["document.md"]);
  assert.throws(() => h.undo("run", "all", "again"), /already undone/);
  assert.equal(await h.worker().runNext(["start"]), true, "the waiting turn starts once the undo finishes");
});

test("admission refuses unfinished or busy turns, and a blocked undo can be retried", async (t) => {
  const h = harness(t);
  assert.throws(() => h.undo("missing"), /finished turn/);
  await h.turn("run");
  h.f.submit("next");
  assert.throws(() => h.undo("run"), /current turn/);
  await h.worker().runNext(["start"]); await h.worker().runNext(["review"]);
  h.setOutcome(() => ({ status: "blocked", conflicts: [{ path: "document.md", reason: "edited" }] }));
  h.undo("run");
  await h.worker().runNext(["undo"]);
  const blocked = h.review("run").undo;
  assert.ok(blocked?.status === "blocked");
  assert.deepEqual(blocked.conflicts, [{ path: "document.md", reason: "edited" }]);
  h.undo("run", "unconflicted", "retry");
  assert.equal(h.review("run").undo?.status, "pending");
  assert.equal(h.f.engine.claimEffect(["undo"])?.action.kind, "undo");
});

test("an undo interrupted by a restart runs again, because restoring re-checks every file first", async (t) => {
  const h = harness(t);
  await h.turn("run");
  h.undo("run");
  assert.ok(h.f.engine.claimEffect(["undo"]));
  h.f.restart(); h.f.engine.recover();
  assert.equal(await h.worker().runNext(["undo"]), true);
  assert.equal(h.review("run").undo?.status, "undone");
});

test("only the newest turns keep snapshots: older turns' undo expires and their unused bytes are freed", async (t) => {
  const h = harness(t);
  for (let index = 1; index <= retainedTurnCheckpoints + 1; index++) await h.turn(`t${index}`);
  assert.equal(h.f.store.restorableCheckpoint("conversation", "t1"), false);
  assert.equal(h.f.store.restorableCheckpoint("conversation", "t2"), true);
  assert.equal(h.review("t1").undo?.status, "expired");
  assert.equal(h.review("t2").undo, undefined);
  assert.throws(() => h.undo("t1"), /no longer kept/);
  const database = h.f.openDatabase();
  assert.equal(database.prepare("SELECT count(*) AS count FROM checkpoint_blobs WHERE hash = ?").get(sha256("Before\n"))?.count, 0);
  assert.equal(database.prepare("SELECT count(*) AS count FROM checkpoint_blobs WHERE hash = ?").get(sha256("Before\nTurn 1\n"))?.count, 1);
});
