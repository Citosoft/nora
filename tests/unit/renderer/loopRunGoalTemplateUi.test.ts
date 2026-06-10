import {
  LOOP_RUN_REVIEW_FEEDBACK_TEMPLATE_ID,
  LOOP_RUN_SPEC_TEMPLATE_ID,
  LOOP_RUN_TASK_TEMPLATE_ID,
  resolveLoopRunGoalKindForTemplate,
  shouldShowLoopRunReviewFeedbackPicker,
  shouldShowLoopRunSpecPicker,
  shouldShowLoopRunTaskPicker
} from "@/components/app/logic/loopRunGoalTemplateUi";
import assert from "node:assert/strict";
import test from "node:test";

test("loop run goal template ui only exposes spec and task pickers for delivery templates", () => {
  assert.equal(shouldShowLoopRunSpecPicker(LOOP_RUN_SPEC_TEMPLATE_ID), true);
  assert.equal(shouldShowLoopRunTaskPicker(LOOP_RUN_TASK_TEMPLATE_ID), true);
  assert.equal(shouldShowLoopRunSpecPicker("smoke-test"), false);
  assert.equal(shouldShowLoopRunTaskPicker("improve-one-area"), false);
  assert.equal(shouldShowLoopRunSpecPicker(""), false);
});

test("loop run goal template ui exposes review feedback picker for the review template", () => {
  assert.equal(shouldShowLoopRunReviewFeedbackPicker(LOOP_RUN_REVIEW_FEEDBACK_TEMPLATE_ID), true);
  assert.equal(shouldShowLoopRunReviewFeedbackPicker("smoke-test"), false);
});

test("resolveLoopRunGoalKindForTemplate maps delivery templates to spec or task when available", () => {
  assert.equal(resolveLoopRunGoalKindForTemplate(LOOP_RUN_SPEC_TEMPLATE_ID, true, true), "spec");
  assert.equal(resolveLoopRunGoalKindForTemplate(LOOP_RUN_TASK_TEMPLATE_ID, true, true), "task");
  assert.equal(resolveLoopRunGoalKindForTemplate(LOOP_RUN_SPEC_TEMPLATE_ID, false, true), "custom");
  assert.equal(resolveLoopRunGoalKindForTemplate("smoke-test", true, true), "custom");
});
