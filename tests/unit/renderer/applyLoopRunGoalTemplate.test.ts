import { applyLoopRunGoalTemplate } from "@/components/app/logic/applyLoopRunGoalTemplate";
import { LOOP_RUN_GOAL_TEMPLATE_GROUPS, LOOP_RUN_GOAL_TEMPLATES } from "@/components/app/constants/loopRunGoalTemplates";
import assert from "node:assert/strict";
import test from "node:test";

test("applyLoopRunGoalTemplate falls back to custom when spec goal is unavailable", () => {
  const template = LOOP_RUN_GOAL_TEMPLATES.find((item) => item.id === "implement-spec");
  assert.ok(template);
  const result = applyLoopRunGoalTemplate({
    template,
    specsAvailable: false,
    tasksAvailable: true,
    selectedSpecPath: "",
    selectedTaskPath: ".nora/tasks/task.md",
    limitsDraft: { maxIterations: 10, maxDurationMinutes: 240, roleTimeoutMinutes: 30 }
  });
  assert.equal(result.goalKind, "custom");
  assert.match(result.objective, /attached spec/i);
});

test("smoke test template tightens guardrails for quick validation", () => {
  const template = LOOP_RUN_GOAL_TEMPLATES.find((item) => item.id === "smoke-test");
  assert.ok(template);
  const result = applyLoopRunGoalTemplate({
    template,
    specsAvailable: true,
    tasksAvailable: true,
    selectedSpecPath: ".nora/specs/feature.md",
    selectedTaskPath: ".nora/tasks/task.md",
    limitsDraft: { maxIterations: 10, maxDurationMinutes: 240, roleTimeoutMinutes: 30 }
  });
  assert.equal(result.goalKind, "custom");
  assert.equal(result.limitsDraft.maxIterations, 2);
  assert.equal(result.limitsDraft.maxDurationMinutes, 15);
});

test("improve one area template selects and completes a focused codebase improvement", () => {
  const template = LOOP_RUN_GOAL_TEMPLATES.find((item) => item.id === "improve-one-area");
  assert.ok(template);
  assert.equal(template.category, "improvement");
  assert.match(template.objective, /best single feature or product area/i);
  assert.match(template.objective, /success criteria/i);
  assert.match(template.objective, /do not stop after analysis or recommendations/i);
});

test("workflow goal templates are grouped without omissions or duplicate ids", () => {
  const groupedTemplates = LOOP_RUN_GOAL_TEMPLATE_GROUPS.flatMap((group) => group.templates);
  assert.equal(groupedTemplates.length, LOOP_RUN_GOAL_TEMPLATES.length);
  assert.equal(new Set(groupedTemplates.map((template) => template.id)).size, groupedTemplates.length);
  assert.ok(LOOP_RUN_GOAL_TEMPLATE_GROUPS.find((group) => group.id === "improvement")?.templates.length);
});
