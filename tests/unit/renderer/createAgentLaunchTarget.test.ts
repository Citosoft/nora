import { createLaunchTargetFormState, launchTargetModeFromTarget, resolveSupportedLaunchTargetMode } from "@/components/app/logic/createAgentLaunchTarget";
import assert from "node:assert/strict";
import test from "node:test";

test("resolveSupportedLaunchTargetMode falls back when existing worktree or branch options are unavailable", () => {
  assert.equal(resolveSupportedLaunchTargetMode("existing", { worktrees: [], projectBranches: ["main"], isGitProject: true }), "current-branch");
  assert.equal(resolveSupportedLaunchTargetMode("branch-existing", { worktrees: [{ id: "w1" }], projectBranches: [], isGitProject: true }), "current-branch");
  assert.equal(resolveSupportedLaunchTargetMode("new", { worktrees: [], projectBranches: [], isGitProject: true }), "new");
});

test("resolveSupportedLaunchTargetMode launches plain folders in the project folder", () => {
  const availability = { worktrees: [{ id: "w1" }], projectBranches: ["main"], isGitProject: false };
  assert.equal(resolveSupportedLaunchTargetMode("new", availability), "current-branch");
  assert.equal(resolveSupportedLaunchTargetMode("existing", availability), "current-branch");
  assert.equal(resolveSupportedLaunchTargetMode("branch-new", availability), "current-branch");
});

test("launchTargetModeFromTarget maps worktree targets to dialog modes", () => {
  assert.equal(launchTargetModeFromTarget({ kind: "new" }), "new");
  assert.equal(launchTargetModeFromTarget({ kind: "existing", worktreeId: "w1" }), "existing");
  assert.equal(launchTargetModeFromTarget({ kind: "root" }), "current-branch");
  assert.equal(launchTargetModeFromTarget({ kind: "session-default" }), "current-branch");
});

test("createLaunchTargetFormState builds form payload for each launch mode", () => {
  assert.deepEqual(
    createLaunchTargetFormState("existing", [{ id: "worktree-1" }], ["main"]),
    {
      target: { kind: "existing", worktreeId: "worktree-1" },
      branchCheckout: null,
      prepareWorktree: false
    }
  );

  assert.deepEqual(
    createLaunchTargetFormState("branch-existing", [], ["main", "develop"]),
    {
      target: { kind: "root" },
      branchCheckout: { mode: "existing", branchName: "main" },
      prepareWorktree: false
    }
  );

  assert.deepEqual(
    createLaunchTargetFormState("new", [], [], true),
    {
      target: { kind: "new" },
      branchCheckout: null,
      prepareWorktree: true
    }
  );
});
