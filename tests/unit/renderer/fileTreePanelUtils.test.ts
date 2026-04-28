import { buildFileTree, getParentDirectoryPath } from "@/components/app/logic/fileTreePanelUtils";
import assert from "node:assert/strict";
import test from "node:test";

test("buildFileTree sorts directories before files at the same level", () => {
  const tree = buildFileTree(["b.txt", "a/z.txt"], ["a"]);
  const names = tree.map((n) => n.name);
  assert.deepEqual(names, ["a", "b.txt"]);
});

test("getParentDirectoryPath handles nested paths", () => {
  assert.equal(getParentDirectoryPath("a/b/c.txt"), "a/b");
  assert.equal(getParentDirectoryPath("root.txt"), "");
});
