import assert from "node:assert/strict";
import { lstat, mkdir, readFile, rename, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { pinUndoBytes } from "@main/execution/checkpoints/undo";
import { gitFixture } from "./fixture";

async function turn(t: TestContext) {
  const f = await gitFixture(t);
  const baseline = await f.service.capture(f.workspace); assert.ok(baseline.status === "ready");
  await f.write("document.md", "Original\nTurn edit\n");
  await mkdir(join(f.root, "added")); await f.write("added/new.md", "New\n");
  await f.git("rm", "-q", "unchanged.md");
  const final = await f.service.capture(f.workspace); assert.ok(final.status === "ready");
  const review = await f.service.compare(f.workspace, baseline.snapshot, final.snapshot);
  const entries = new Map([...baseline.snapshot.files, ...(baseline.snapshot.indexed ?? [])].map((entry) => [entry.path, entry]));
  const targets = await Promise.all(review.changes.map(async (change) => {
    const entry = entries.get(change.path);
    return { path: change.path,
      after: change.afterHash && change.afterMode ? { hash: change.afterHash, mode: change.afterMode } : null,
      before: change.beforeHash && change.beforeMode && entry ? { hash: change.beforeHash, mode: change.beforeMode, content: await f.service.read(f.workspace, entry) } : null };
  }));
  return { ...f, baseline, review, targets };
}

test("undo restores modified, added and deleted files to their pre-turn bytes, and a retry is a no-op", async (t) => {
  const f = await turn(t);
  assert.deepEqual(f.review.changes.map((change) => [change.path, change.kind]),
    [["added/new.md", "added"], ["document.md", "modified"], ["unchanged.md", "deleted"]]);
  const outcome = await f.service.restore(f.workspace, f.targets, "all");
  assert.deepEqual(outcome, { status: "undone", mode: "all", restored: ["added/new.md", "document.md", "unchanged.md"], skipped: [] });
  assert.equal(await readFile(join(f.root, "document.md"), "utf8"), "Original\n");
  assert.equal(await readFile(join(f.root, "unchanged.md"), "utf8"), "Unchanged\n");
  await assert.rejects(lstat(join(f.root, "added/new.md")), { code: "ENOENT" });
  assert.deepEqual(await f.service.restore(f.workspace, f.targets, "all"),
    { status: "undone", mode: "all", restored: ["added/new.md", "document.md", "unchanged.md"], skipped: [] });
});

test("a file edited after the turn blocks a full undo untouched, and the unconflicted mode restores only the rest", async (t) => {
  const f = await turn(t);
  await f.write("document.md", "Original\nTurn edit\nMy own edit\n");
  assert.deepEqual(await f.service.restore(f.workspace, f.targets, "all"),
    { status: "blocked", conflicts: [{ path: "document.md", reason: "edited" }] });
  assert.equal(await readFile(join(f.root, "added/new.md"), "utf8"), "New\n");
  const partial = await f.service.restore(f.workspace, f.targets, "unconflicted");
  assert.deepEqual(partial, { status: "undone", mode: "unconflicted", restored: ["added/new.md", "unchanged.md"],
    skipped: [{ path: "document.md", reason: "edited" }] });
  assert.equal(await readFile(join(f.root, "document.md"), "utf8"), "Original\nTurn edit\nMy own edit\n");
});

test("fingerprint-only bytes are unrestorable and symlinked parent folders are never followed", async (t) => {
  const f = await turn(t);
  const fingerprinted = f.targets.map((target) => target.path === "document.md" && target.before ? { ...target, before: { ...target.before, content: null } } : target);
  assert.deepEqual(await f.service.restore(f.workspace, fingerprinted, "all"),
    { status: "blocked", conflicts: [{ path: "document.md", reason: "unrestorable" }] });
  await rename(join(f.root, "added"), join(f.directory, "outside"));
  await symlink(join(f.directory, "outside"), join(f.root, "added"), "dir");
  const outcome = await f.service.restore(f.workspace, f.targets, "unconflicted");
  assert.ok(outcome.status === "undone");
  assert.deepEqual(outcome.skipped, [{ path: "added/new.md", reason: "edited" }]);
  assert.equal(await readFile(join(f.directory, "outside/new.md"), "utf8"), "New\n");
});

test("pre-turn bytes of changed indexed files are pinned at review time, and nothing else", async (t) => {
  const f = await turn(t);
  await writeFile(join(f.root, "untouched.md"), "Not part of the turn\n");
  const pinned: Uint8Array[][] = [];
  const engine = { pinCheckpointBlobs(_conversationId: string, _runId: string, contents: readonly Uint8Array[]) { pinned.push([...contents]); } };
  const effect = { id: "undo", conversationId: "conversation", runId: "run", attemptId: "attempt", status: "claimed" as const, action: { kind: "review" as const } };
  await pinUndoBytes(engine, effect, f.workspace, f.service, f.baseline.snapshot, f.review);
  assert.deepEqual(pinned.map((batch) => batch.map((content) => Buffer.from(content).toString())), [["Original\n", "Unchanged\n"]]);
});
