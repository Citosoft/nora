import {
  buildDiffAnnotationKey,
  buildDiffReviewPrompt,
  canAnnotateDiffLine,
  groupDiffAnnotationsByPath,
  sortDiffAnnotations
} from "@/components/app/logic/diffAnnotation";
import type { DiffAnnotation } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

test("buildDiffAnnotationKey matches inline comment keys", () => {
  assert.equal(buildDiffAnnotationKey("src/a.ts", 4, 5), "src/a.ts|4|5");
});

test("canAnnotateDiffLine allows changed lines only", () => {
  assert.equal(canAnnotateDiffLine({ key: "add", text: "+foo", oldLine: null, newLine: 12 }), true);
  assert.equal(canAnnotateDiffLine({ key: "hunk", text: "@@", oldLine: null, newLine: null }), false);
});

test("buildDiffReviewPrompt groups comments by file with diff context", () => {
  const annotations: DiffAnnotation[] = [
    {
      id: "a",
      createdAt: "2026-06-03T12:00:00.000Z",
      target: { path: "src/a.ts", oldLine: null, newLine: 12, lineText: "+const value = 1;" },
      body: "Use a named constant."
    },
    {
      id: "b",
      createdAt: "2026-06-03T12:01:00.000Z",
      target: { path: "src/b.ts", oldLine: 3, newLine: null, lineText: "-legacy()" },
      body: "Keep this helper for now."
    }
  ];

  const prompt = buildDiffReviewPrompt(annotations);
  assert.match(prompt, /Please address the following inline review comments/);
  assert.match(prompt, /## src\/a\.ts/);
  assert.match(prompt, /Line 12 \(added\)/);
  assert.match(prompt, /Use a named constant\./);
  assert.match(prompt, /## src\/b\.ts/);
  assert.match(prompt, /Line 3 \(removed\)/);
});

test("sortDiffAnnotations orders by path then line", () => {
  const annotations: DiffAnnotation[] = [
    {
      id: "b",
      createdAt: "2026-06-03T12:01:00.000Z",
      target: { path: "b.ts", oldLine: null, newLine: 2, lineText: "+b" },
      body: "second file"
    },
    {
      id: "a",
      createdAt: "2026-06-03T12:00:00.000Z",
      target: { path: "a.ts", oldLine: null, newLine: 10, lineText: "+a" },
      body: "first file"
    }
  ];

  const sorted = sortDiffAnnotations(annotations);
  assert.deepEqual(sorted.map((entry) => entry.target.path), ["a.ts", "b.ts"]);
  assert.equal(groupDiffAnnotationsByPath(sorted).size, 2);
});
