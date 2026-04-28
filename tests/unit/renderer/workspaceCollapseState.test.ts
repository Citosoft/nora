import {
  areAllWorkspaceGroupsCollapsed,
  createWorkspaceCollapseMap
} from "@/components/app/logic/workspaceCollapseState";
import assert from "node:assert/strict";
import test from "node:test";

test("areAllWorkspaceGroupsCollapsed returns true only when every listed workspace is collapsed", () => {
  assert.equal(areAllWorkspaceGroupsCollapsed([], {}), false);
  assert.equal(areAllWorkspaceGroupsCollapsed(["a", "b"], { a: true, b: true }), true);
  assert.equal(areAllWorkspaceGroupsCollapsed(["a", "b"], { a: true, b: false }), false);
  assert.equal(areAllWorkspaceGroupsCollapsed(["a", "b"], { a: true }), false);
});

test("createWorkspaceCollapseMap creates a map for all listed workspace ids", () => {
  assert.deepEqual(createWorkspaceCollapseMap(["a", "b"], true), { a: true, b: true });
  assert.deepEqual(createWorkspaceCollapseMap(["a"], false), { a: false });
});
