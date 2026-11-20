import { buildLoopRunSetupDefaults } from "@/components/app/logic/buildLoopRunSetupDefaults";
import { LOOP_RUN_GOAL_TEMPLATES } from "@/components/app/constants/loopRunGoalTemplates";
import { LOOP_RUN_TASK_TEMPLATE_ID } from "@/components/app/logic/loopRunGoalTemplateUi";
import type { LoopDefinition } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const definition: LoopDefinition = {
  id: "loop-1",
  projectId: "project-1",
  name: "Implement then review",
  description: "",
  stages: [],
  limits: { maxIterations: 6, maxDurationMs: 60 * 60_000, roleTimeoutMs: 20 * 60_000 },
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
};

test("buildLoopRunSetupDefaults starts a plain run blank, on the workflow's own limits and name", () => {
  const defaults = buildLoopRunSetupDefaults(definition, null);
  assert.equal(defaults.templateId, "");
  assert.equal(defaults.goalKind, "custom");
  assert.equal(defaults.selectedTaskPath, "");
  assert.equal(defaults.objective, "");
  assert.equal(defaults.branchName, "Implement then review");
});

test("buildLoopRunSetupDefaults launches a task run on the Complete task template with that task", () => {
  const template = LOOP_RUN_GOAL_TEMPLATES.find((entry) => entry.id === LOOP_RUN_TASK_TEMPLATE_ID);
  assert.ok(template);
  const defaults = buildLoopRunSetupDefaults(definition, { path: "/repo/.nora/tasks/add-login.md", title: "Add login" });
  assert.equal(defaults.templateId, LOOP_RUN_TASK_TEMPLATE_ID);
  assert.equal(defaults.goalKind, "task");
  assert.equal(defaults.selectedTaskPath, "/repo/.nora/tasks/add-login.md");
  assert.equal(defaults.objective, template.objective);
  assert.equal(defaults.branchName, "Add login");
  assert.deepEqual(defaults.limitsDraft, { maxIterations: 6, maxDurationMinutes: 60, roleTimeoutMinutes: 20 });
});

test("buildLoopRunSetupDefaults falls back to the workflow name when the task has no title", () => {
  assert.equal(buildLoopRunSetupDefaults(definition, { path: "/repo/.nora/tasks/x.md", title: "  " }).branchName, "Implement then review");
});
