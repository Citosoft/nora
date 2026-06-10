import {
  buildLoopRunGoalPromptSection,
  hasLoopRunGoal,
  normalizeLoopRunGoal,
  resolveLoopRunGoalAttachmentPath
} from "@shared/loopRunGoal";
import assert from "node:assert/strict";
import test from "node:test";

test("normalizeLoopRunGoal accepts spec, task, or custom objective", () => {
  assert.deepEqual(normalizeLoopRunGoal({ specPath: ".nora/specs/feature.md" }), {
    objective: "",
    specPath: ".nora/specs/feature.md",
    taskPath: null
  });
  assert.deepEqual(normalizeLoopRunGoal({ taskPath: ".nora/tasks/feature.md", objective: "Extra" }), {
    objective: "Extra",
    specPath: null,
    taskPath: ".nora/tasks/feature.md"
  });
  assert.deepEqual(normalizeLoopRunGoal({ objective: "Ship it" }), {
    objective: "Ship it",
    specPath: null,
    taskPath: null
  });
});

test("normalizeLoopRunGoal rejects empty and conflicting goals", () => {
  assert.throws(() => normalizeLoopRunGoal({}), /required/);
  assert.throws(() => normalizeLoopRunGoal({
    specPath: ".nora/specs/a.md",
    taskPath: ".nora/tasks/a.md"
  }), /either a spec or a task/);
});

test("buildLoopRunGoalPromptSection describes attached goals", () => {
  assert.match(buildLoopRunGoalPromptSection({
    objective: "",
    specPath: ".nora/specs/feature.md",
    taskPath: null
  }), /Spec \(source of truth\)/);
  assert.match(buildLoopRunGoalPromptSection({
    objective: "Extra",
    specPath: null,
    taskPath: ".nora/tasks/feature.md"
  }), /Task \(source of truth\)/);
  assert.match(buildLoopRunGoalPromptSection({
    objective: "Ship it",
    specPath: null,
    taskPath: null
  }), /^Objective:/);
});

test("resolveLoopRunGoalAttachmentPath prefers the selected file goal", () => {
  assert.equal(resolveLoopRunGoalAttachmentPath({
    objective: "",
    specPath: ".nora/specs/feature.md",
    taskPath: null
  }), ".nora/specs/feature.md");
  assert.equal(hasLoopRunGoal({ specPath: ".nora/specs/feature.md" }), true);
});
