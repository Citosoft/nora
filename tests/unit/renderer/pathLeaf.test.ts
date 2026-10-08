import { getPathLeafName } from "@/components/app/logic/pathLeaf";
import assert from "node:assert/strict";
import test from "node:test";

test("getPathLeafName returns the last segment of POSIX and Windows paths", () => {
  assert.equal(getPathLeafName("/Users/dev/nora-oss"), "nora-oss");
  assert.equal(getPathLeafName("C:\\repos\\nora-oss"), "nora-oss");
});

test("getPathLeafName ignores trailing separators and surrounding whitespace", () => {
  assert.equal(getPathLeafName(" /Users/dev/nora-oss/ "), "nora-oss");
});

test("getPathLeafName returns an empty string when there is no segment", () => {
  assert.equal(getPathLeafName(""), "");
  assert.equal(getPathLeafName("/"), "");
  assert.equal(getPathLeafName(null), "");
});
