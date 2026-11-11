import assert from "node:assert/strict";
import test from "node:test";
import { parsePatchLines, patchLineCounts, sumPatchLineCounts } from "@shared/conversations/diff";
import { simulatedFileChanges } from "../../simulator/fileChanges";

test("diff counts exclude file headers while retaining code resembling headers", () => {
  const patch = "--- a/file\n+++ b/file\n@@ -1,2 +1,3 @@\n---value\n+++value\n+added\n same\n";
  assert.deepEqual(patchLineCounts(patch), { additions: 2, deletions: 1 });
  assert.deepEqual(parsePatchLines(patch).slice(0, 3).map((line) => line.kind), ["metadata", "metadata", "metadata"]);
  assert.deepEqual(parsePatchLines(patch).slice(3, 6).map((line) => line.kind), ["deletion", "addition", "addition"]);
});

test("added and deleted files and multiple hunks count their actual lines", () => {
  assert.deepEqual(patchLineCounts("--- /dev/null\n+++ b/new\n@@ -0,0 +1,2 @@\n+one\n+two\n"), { additions: 2, deletions: 0 });
  assert.deepEqual(patchLineCounts("--- a/old\n+++ /dev/null\n@@ -1,2 +0,0 @@\n-one\n-two\n"), { additions: 0, deletions: 2 });
  assert.deepEqual(patchLineCounts("@@ -1 +1 @@\n-old\n+new\n--- a/second\n+++ b/second\n@@ -4 +4 @@\n-before\n+after\n"), { additions: 2, deletions: 2 });
});

test("unavailable and binary patches stay unknown; partial totals only count available patches", () => {
  assert.equal(patchLineCounts(null), null);
  assert.equal(patchLineCounts("Binary files a/image.png and b/image.png differ"), null);
  assert.equal(sumPatchLineCounts([null, undefined]), null);
  assert.deepEqual(sumPatchLineCounts(simulatedFileChanges.map((change) => change.patch)), { additions: 3, deletions: 2 });
});
