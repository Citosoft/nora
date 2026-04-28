import {
  filterPathsByPrefix,
  normalizeListPrefix,
  shapeReadFileResult
} from "@/components/app/ai/workspaceAiChatToolUtils";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeListPrefix trims and rejects traversal", () => {
  assert.equal(normalizeListPrefix(undefined), undefined);
  assert.equal(normalizeListPrefix("  "), undefined);
  assert.equal(normalizeListPrefix("../x"), undefined);
  assert.equal(normalizeListPrefix("./src/foo/"), "src/foo");
  assert.equal(normalizeListPrefix("\\pkg\\a"), "pkg/a");
});

test("filterPathsByPrefix keeps exact match and children", () => {
  const paths = ["src/a.ts", "src/lib/b.ts", "other/c.ts"];
  assert.deepEqual(filterPathsByPrefix(paths, undefined), paths);
  assert.deepEqual(filterPathsByPrefix(paths, "src"), ["src/a.ts", "src/lib/b.ts"]);
  assert.deepEqual(filterPathsByPrefix(paths, "src/lib"), ["src/lib/b.ts"]);
});

test("shapeReadFileResult truncates oversized whole file reads", () => {
  const huge = "x".repeat(100_001);
  const result = shapeReadFileResult(huge);
  assert.equal(result.content.length, 100_000);
  assert.equal(result.truncated, true);
  assert.equal(result.returnedLines, null);
});

test("shapeReadFileResult slices lines and reports line cap", () => {
  const lines = Array.from({ length: 600 }, (_, index) => `L${index + 1}`);
  const raw = lines.join("\n");
  const result = shapeReadFileResult(raw, 1, 600);
  assert.equal(result.returnedLines, 500);
  assert.equal(result.truncated, true);
  assert.match(result.truncatedReason ?? "", /capped at 500 lines/);
});
