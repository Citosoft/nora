import assert from "node:assert/strict";
import {
  countBufferedContextChars,
  dedupeConsecutiveContextLines,
  dedupeRepeatedTrailingLineBlocks,
  shouldForceFlushContextBuffer,
  TRANSCRIPT_CONTEXT_FLUSH_MAX_CHARS,
  TRANSCRIPT_CONTEXT_FLUSH_MAX_LINES
} from "@main/orchestrator/transcriptContextBuffer";

assert.deepEqual(dedupeConsecutiveContextLines(["a", "a", "b", "b", "b"]), ["a", "b"]);
assert.deepEqual(dedupeConsecutiveContextLines([]), []);
assert.equal(countBufferedContextChars(["ab", "cd"]), 5);
assert.equal(shouldForceFlushContextBuffer(Array.from({ length: TRANSCRIPT_CONTEXT_FLUSH_MAX_LINES }, () => "x")), true);
assert.equal(shouldForceFlushContextBuffer(["x".repeat(TRANSCRIPT_CONTEXT_FLUSH_MAX_CHARS)]), true);
assert.equal(shouldForceFlushContextBuffer(["hi"]), false);

assert.deepEqual(
  dedupeRepeatedTrailingLineBlocks(["a", "b", "c", "a", "b", "c"], 3),
  ["a", "b", "c"]
);
assert.deepEqual(
  dedupeRepeatedTrailingLineBlocks(["a", "b", "c", "a", "b", "c", "a", "b", "c"], 3),
  ["a", "b", "c"]
);
assert.deepEqual(dedupeRepeatedTrailingLineBlocks(["x", "y"], 3), ["x", "y"]);
