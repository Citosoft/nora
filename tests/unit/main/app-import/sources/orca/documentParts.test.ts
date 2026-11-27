import assert from "node:assert/strict";
import { test } from "node:test";
import { assembleOrcaDomain, parseOrcaPartKey } from "@main/app-import/sources/orca/documentParts";

test("split domain parts reassemble into the original document", () => {
  const parts = [
    { path: ["tabsByWorktree", "r::/a"], payload: JSON.stringify([{ id: "t" }]) },
    { path: ["tabsByWorktree", "r::/b"], payload: "[]" },
    { path: ["activeRepoId"], payload: JSON.stringify("r") },
    { path: ["unifiedTabs"], payload: "{}" }
  ];
  assert.deepEqual(assembleOrcaDomain(parts), { tabsByWorktree: { "r::/a": [{ id: "t" }], "r::/b": [] }, activeRepoId: "r", unifiedTabs: {} });
  assert.deepEqual(assembleOrcaDomain([{ path: [], payload: "[1,2]" }]), [1, 2]);
  assert.deepEqual(assembleOrcaDomain([]), {});
});

test("part keys must be JSON string arrays", () => {
  assert.deepEqual(parseOrcaPartKey('["a","b"]'), ["a", "b"]);
  assert.equal(parseOrcaPartKey("[1]"), null);
  assert.equal(parseOrcaPartKey("nope"), null);
});
