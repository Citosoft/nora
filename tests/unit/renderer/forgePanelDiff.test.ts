import assert from "node:assert/strict";
import test from "node:test";
import { parseDiffLines, withoutFileHeader } from "@/components/app/logic/forgePanelDiff";

const patch = "diff --git a/f b/f\nindex 1..2 100644\n--- a/f\n+++ b/f\n@@ -3,3 +3,3 @@\n keep\n---value\n+++value\n tail\n";

test("diff lines are classified by hunk position, so code that looks like a file header is still an edit", () => {
  const lines = parseDiffLines(patch);
  assert.deepEqual(lines.map((line) => line.tone),
    ["metadata", "metadata", "metadata", "metadata", "hunk", "context", "deletion", "addition", "context", "metadata"]);
  assert.deepEqual(lines.slice(5, 9).map(({ oldLine, newLine }) => [oldLine, newLine]), [[3, 3], [4, null], [null, 4], [5, 5]]);
});

test("file headers and the trailing blank line are dropped, but a hunkless patch keeps its header", () => {
  assert.deepEqual(withoutFileHeader(parseDiffLines(patch)).map((line) => line.text), ["@@ -3,3 +3,3 @@", " keep", "---value", "+++value", " tail"]);
  const binary = "diff --git a/img.png b/img.png\nBinary files a/img.png and b/img.png differ";
  assert.deepEqual(withoutFileHeader(parseDiffLines(binary)).map((line) => line.text), binary.split("\n"));
});
