import { MAX_FORGE_DIFF_PREVIEW_CHARS, limitForgeDiffForTransport } from "@shared/forgeDiff";
import assert from "node:assert/strict";
import test from "node:test";

test("limitForgeDiffForTransport preserves diffs within the preview limit", () => {
  const diff = "+small change";

  assert.equal(limitForgeDiffForTransport(diff), diff);
});

test("limitForgeDiffForTransport bounds retained diffs while preserving truncation detection", () => {
  const diff = "x".repeat(MAX_FORGE_DIFF_PREVIEW_CHARS + 500);
  const limited = limitForgeDiffForTransport(diff);

  assert.equal(limited.length, MAX_FORGE_DIFF_PREVIEW_CHARS + 1);
  assert.equal(limited, diff.slice(0, MAX_FORGE_DIFF_PREVIEW_CHARS + 1));
});
