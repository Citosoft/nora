import {
  buildLoopLimitsFromDraft,
  isLoopLimitsDraftValid,
  loopLimitsToDraft,
  resolveLoopRunLimits,
  validateLoopLimits
} from "@shared/loopLimits";
import assert from "node:assert/strict";
import test from "node:test";

const limits = {
  maxIterations: 10,
  maxDurationMs: 3_600_000,
  roleTimeoutMs: 1_800_000
};

test("loopLimits draft helpers round-trip minute fields", () => {
  const draft = loopLimitsToDraft(limits);
  assert.deepEqual(buildLoopLimitsFromDraft(draft), limits);
  assert.equal(isLoopLimitsDraftValid(draft), true);
});

test("validateLoopLimits rejects invalid ranges", () => {
  assert.throws(() => validateLoopLimits({ ...limits, maxIterations: 0 }), /between 1 and 100/);
});

test("resolveLoopRunLimits prefers run overrides over pattern defaults", () => {
  const override = { maxIterations: 3, maxDurationMs: 600_000, roleTimeoutMs: 120_000 };
  assert.deepEqual(resolveLoopRunLimits(limits, override), override);
  assert.deepEqual(resolveLoopRunLimits(limits), limits);
});
