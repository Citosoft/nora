import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { compareSnapshots } from "@main/execution/checkpoints/diff";
import { gitFixture, snapshot } from "./fixture";

test("turn diffs exclude pre-existing edits and produce applicable patches for changed/added/deleted files", async (t) => {
  const f = await gitFixture(t);
  await f.write("document.md", "User's pre-existing edit\n"); await f.write("removed.md", "Remove me\n");
  const baseline = snapshot({ "document.md": "User's pre-existing edit\n", "unchanged.md": "Unchanged\n", "removed.md": "Remove me\n" });
  const final = snapshot({ "document.md": "User's pre-existing edit\nTurn addition\n", "unchanged.md": "Unchanged\n", "new file.md": "New output\n" }, "2026-11-09T10:01:00.000Z");
  const result = await compareSnapshots("git", baseline, final);
  assert.equal(result.scope, "turn"); assert.equal(result.attribution, "observed");
  assert.deepEqual(result.changes.map((change) => [change.path, change.kind]),
    [["document.md", "modified"], ["new file.md", "added"], ["removed.md", "deleted"]]);
  assert.ok(result.changes[0].patch?.includes(" User's pre-existing edit\n+Turn addition"));
  assert.equal(result.changes[0].patch?.includes("-Original"), false);
  assert.equal(result.changes[0].patch?.includes("nora-turn-diff-"), false);
  const patch = join(f.directory, "changes.patch");
  await writeFile(patch, result.changes.map((change) => change.patch).join(""));
  await f.git("apply", "--check", patch);
});

test("binary, large and mode-only changes retain identities without fabricated textual patches", async () => {
  const baseline = snapshot({ "binary.bin": "a\0b", "mode.sh": "echo hello\n", "large.md": "a".repeat(100_000) });
  const final = snapshot({ "binary.bin": "a\0c", "mode.sh": "echo hello\n", "large.md": "b".repeat(100_000) });
  const executable = final.files.find((file) => file.path === "mode.sh"); assert.ok(executable); executable.mode = "100755";
  const result = await compareSnapshots("git", baseline, final);
  assert.deepEqual(result.changes.map((change) => [change.path, change.presentation]),
    [["binary.bin", "binary"], ["large.md", "too-large"], ["mode.sh", "text"]]);
  assert.equal(result.changes[0].patch, null); assert.notEqual(result.changes[0].beforeHash, result.changes[0].afterHash);
  assert.equal(result.changes[1].patch, null); assert.ok(result.changes[2].patch?.includes("old mode 100644\nnew mode 100755"));
});

test("an unchanged checkpoint produces no turn changes and Git execution failure cannot become clean evidence", async () => {
  const baseline = snapshot({ "document.md": "Already dirty\n" });
  assert.deepEqual((await compareSnapshots("git", baseline, baseline)).changes, []);
  await assert.rejects(compareSnapshots("/missing/git", baseline, snapshot({ "document.md": "Different\n" })));
});

test("the aggregate patch budget retains every change while marking omitted text explicitly", async () => {
  const before: Record<string, string> = {}; const after: Record<string, string> = {};
  for (let index = 0; index < 8; index++) {
    before[`file-${index}.md`] = `${"a".repeat(35_000)}\n`;
    after[`file-${index}.md`] = `${"b".repeat(35_000)}\n`;
  }
  const review = await compareSnapshots("git", snapshot(before), snapshot(after));
  assert.equal(review.changes.length, 8);
  assert.ok(review.changes.some((change) => change.presentation === "too-large" && change.patch === null));
  assert.ok(review.changes.reduce((total, change) => total + Buffer.byteLength(change.patch ?? ""), 0) <= 512 * 1024);
});


test("the same bytes moving into or out of the retained budget do not become false changes", async () => {
  const captured = snapshot({ "file.md": "Same\n" });
  const fingerprinted = { ...snapshot({}), omitted: [{ path: "file.md", mode: "100644" as const,
    hash: createHash("sha256").update("Same\n").digest("hex") }] };
  assert.deepEqual((await compareSnapshots("git", captured, fingerprinted)).changes, []);
  assert.deepEqual((await compareSnapshots("git", fingerprinted, captured)).changes, []);
  const deleted = await compareSnapshots("git", fingerprinted, snapshot({}));
  assert.equal(deleted.changes[0].kind, "deleted");
  assert.equal(deleted.changes[0].presentation, "too-large");
  assert.equal(deleted.changes[0].patch, null);
});
