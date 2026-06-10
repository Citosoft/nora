import {
  buildLoopRunGoalPromptSection,
  hasLoopRunGoal,
  normalizeLoopRunGoal,
  resolveLoopRunGoalAttachmentPath
} from "@shared/loopRunGoal";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeLoopRunGoal accepts spec, task, handoff, or custom objective", () => {
  assert.deepEqual(normalizeLoopRunGoal({ specPath: ".nora/specs/feature.md" }), {
    objective: "",
    specPath: ".nora/specs/feature.md",
    taskPath: null,
    handoffPath: null
  });
  assert.deepEqual(normalizeLoopRunGoal({ taskPath: ".nora/tasks/feature.md", objective: "Extra" }), {
    objective: "Extra",
    specPath: null,
    taskPath: ".nora/tasks/feature.md",
    handoffPath: null
  });
  assert.deepEqual(normalizeLoopRunGoal({ handoffPath: ".nora/agent_handoffs/review.md" }), {
    objective: "",
    specPath: null,
    taskPath: null,
    handoffPath: ".nora/agent_handoffs/review.md"
  });
  assert.deepEqual(normalizeLoopRunGoal({ objective: "Ship it" }), {
    objective: "Ship it",
    specPath: null,
    taskPath: null,
    handoffPath: null
  });
});

test("normalizeLoopRunGoal rejects empty and conflicting goals", () => {
  assert.throws(() => normalizeLoopRunGoal({}), /required/);
  assert.throws(() => normalizeLoopRunGoal({
    specPath: ".nora/specs/a.md",
    taskPath: ".nora/tasks/a.md"
  }), /Choose only one attached workflow goal file/);
});

test("buildLoopRunGoalPromptSection describes attached goals", () => {
  assert.match(buildLoopRunGoalPromptSection({
    objective: "",
    specPath: ".nora/specs/feature.md",
    taskPath: null,
    handoffPath: null
  }), /Spec \(source of truth\)/);
  assert.match(buildLoopRunGoalPromptSection({
    objective: "Extra",
    specPath: null,
    taskPath: ".nora/tasks/feature.md",
    handoffPath: null
  }), /Task \(source of truth\)/);
  assert.match(buildLoopRunGoalPromptSection({
    objective: "",
    specPath: null,
    taskPath: null,
    handoffPath: ".nora/agent_handoffs/review.md"
  }), /Review feedback handoff/);
  assert.match(buildLoopRunGoalPromptSection({
    objective: "Ship it",
    specPath: null,
    taskPath: null,
    handoffPath: null
  }), /^Objective:/);
});

test("resolveLoopRunGoalAttachmentPath prefers the selected file goal", () => {
  assert.equal(resolveLoopRunGoalAttachmentPath({
    objective: "",
    specPath: ".nora/specs/feature.md",
    taskPath: null,
    handoffPath: null
  }), ".nora/specs/feature.md");
  assert.equal(resolveLoopRunGoalAttachmentPath({
    objective: "",
    specPath: null,
    taskPath: null,
    handoffPath: ".nora/agent_handoffs/review.md"
  }), ".nora/agent_handoffs/review.md");
  assert.equal(hasLoopRunGoal({ handoffPath: ".nora/agent_handoffs/review.md" }), true);
});
