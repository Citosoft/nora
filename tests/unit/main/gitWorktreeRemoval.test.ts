import {
  isMissingGitWorktreeError,
  removeGitWorktreeIfRegistered
} from "@main/helpers/gitWorktreeRemoval";
import assert from "node:assert/strict";
import test from "node:test";

test("missing Git worktree errors are recognized from command failures", () => {
  const error = new Error(
    "Command failed: git worktree remove --force /tmp/checkout\n" +
      "fatal: '/tmp/checkout' is not a working tree"
  );

  assert.equal(isMissingGitWorktreeError(error), true);
});

test("missing Git worktree errors are recognized from stderr", () => {
  const error = Object.assign(new Error("Command failed"), {
    stderr: "fatal: '/tmp/checkout' is not a working tree"
  });

  assert.equal(isMissingGitWorktreeError(error), true);
});

test("stale Git worktree registrations do not block managed cleanup", async () => {
  await assert.doesNotReject(() =>
    removeGitWorktreeIfRegistered(async () => {
      throw new Error("fatal: '/tmp/checkout' is not a working tree");
    })
  );
});

test("genuine Git worktree removal failures still propagate", async () => {
  await assert.rejects(
    () =>
      removeGitWorktreeIfRegistered(async () => {
        throw new Error("fatal: cannot remove a locked working tree");
      }),
    /locked working tree/
  );
});
