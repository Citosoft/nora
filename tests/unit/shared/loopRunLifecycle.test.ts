import { isLoopRunDeletable } from "@shared/loopRunLifecycle";
import assert from "node:assert/strict";
import test from "node:test";

test("only inactive loop runs can be deleted", () => {
  assert.equal(isLoopRunDeletable("preparing"), false);
  assert.equal(isLoopRunDeletable("running"), false);
  assert.equal(isLoopRunDeletable("pausing"), false);
  assert.equal(isLoopRunDeletable("paused"), true);
  assert.equal(isLoopRunDeletable("completed"), true);
  assert.equal(isLoopRunDeletable("cancelled"), true);
});
