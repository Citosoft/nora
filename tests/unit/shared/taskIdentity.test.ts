import assert from "node:assert/strict";
import test from "node:test";
import { taskIdFromPath } from "@shared/taskIdentity";

test("task ids stay stable across completion, nested paths and path separators", () => {
  for (const path of [".nora/tasks/fix-login-abc.md", ".nora/tasks/completed/fix-login-abc.md", "/project/.nora/tasks/fix-login-abc.md", "C:\\project\\.nora\\tasks\\completed\\fix-login-abc.md"]) {
    assert.equal(taskIdFromPath(path), "fix-login-abc");
  }
  assert.equal(taskIdFromPath(".nora/tasks/feature/fix.markdown"), "feature/fix");
});
