import { formatWorktreeBranchPreview, slugifyWorktreeBranchSegment } from "@/components/app/logic/formatWorktreeBranchPreview";
import assert from "node:assert/strict";
import test from "node:test";

test("slugifyWorktreeBranchSegment matches main-process branch slug rules", () => {
  assert.equal(slugifyWorktreeBranchSegment("Fix auth"), "fix-auth");
  assert.equal(slugifyWorktreeBranchSegment("  My Feature!!  "), "my-feature");
});

test("formatWorktreeBranchPreview combines prefix and slugified branch name", () => {
  assert.equal(formatWorktreeBranchPreview("loop", "Delivery Run"), "loop/delivery-run");
  assert.equal(formatWorktreeBranchPreview("feature", " add-cool-feature "), "feature/add-cool-feature");
});
