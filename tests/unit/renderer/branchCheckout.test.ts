import { getBranchCheckoutBlockedReason, getCheckoutableBranches } from "@/components/app/logic/branchCheckout";
import assert from "node:assert/strict";
import test from "node:test";

test("getCheckoutableBranches drops the active and blank branches and sorts the rest", () => {
  assert.deepEqual(getCheckoutableBranches(["main", "  ", "feature/b", "feature/a"], "main"), ["feature/a", "feature/b"]);
  assert.deepEqual(getCheckoutableBranches(["main"], null), ["main"]);
});

test("getBranchCheckoutBlockedReason explains the first blocker", () => {
  assert.equal(
    getBranchCheckoutBlockedReason({ isInspectingCommit: true, hasUncommittedChanges: true, checkoutableBranchCount: 0 }),
    "Return to working tree before switching branches"
  );
  assert.equal(
    getBranchCheckoutBlockedReason({ hasUncommittedChanges: true, checkoutableBranchCount: 2 }),
    "Commit or discard changes before switching branches"
  );
  assert.equal(
    getBranchCheckoutBlockedReason({ hasUncommittedChanges: false, checkoutableBranchCount: 0 }),
    "No other local branches are available"
  );
});

test("getBranchCheckoutBlockedReason allows a clean checkout with other branches", () => {
  assert.equal(getBranchCheckoutBlockedReason({ hasUncommittedChanges: false, checkoutableBranchCount: 1 }), null);
});
