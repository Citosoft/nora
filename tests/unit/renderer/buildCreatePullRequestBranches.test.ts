import { buildCreatePullRequestBranches } from "@/components/app/logic/buildCreatePullRequestBranches";
import assert from "node:assert/strict";
import test from "node:test";

test("buildCreatePullRequestBranches includes the active worktree branch first", () => {
  assert.deepEqual(
    buildCreatePullRequestBranches("loop/improve-one-area", ["main", "feature/existing"], "main"),
    ["loop/improve-one-area", "main", "feature/existing"]
  );
});

test("buildCreatePullRequestBranches removes empty and duplicate branches", () => {
  assert.deepEqual(buildCreatePullRequestBranches(" main ", ["main", ""], "main"), ["main"]);
});
