import {
  createDuplicatedTaskContent,
  createTaskDraft,
  createTaskPlanningInstruction,
  deriveTaskTitle
} from "@shared/taskDraft";
import assert from "node:assert/strict";
import test from "node:test";

test("deriveTaskTitle uses the first markdown heading when present", () => {
  const content = "Paragraph\n# Implement deployment flow\n## Details";
  assert.equal(deriveTaskTitle(content, "Fallback"), "Implement deployment flow");
});

test("deriveTaskTitle falls back when heading is absent", () => {
  assert.equal(deriveTaskTitle("No heading here", "Fallback"), "Fallback");
});

test("createTaskDraft includes required template sections", () => {
  const draft = createTaskDraft("Improve terminal startup");
  assert.match(draft, /^# Improve terminal startup/m);
  assert.match(draft, /^## Goal$/m);
  assert.match(draft, /^## Context$/m);
  assert.match(draft, /^## Definition of done$/m);
});

test("createDuplicatedTaskContent replaces the existing top-level heading", () => {
  const duplicated = createDuplicatedTaskContent("New Title", "# Old Title\n\nBody");
  assert.equal(duplicated, "# New Title\n\nBody");
});

test("createDuplicatedTaskContent prepends heading if source has no heading", () => {
  const duplicated = createDuplicatedTaskContent("New Title", "Body content");
  assert.equal(duplicated, "# New Title\n\nBody content");
});

test("createTaskPlanningInstruction prioritizes specPath guidance over brief", () => {
  const instruction = createTaskPlanningInstruction({
    projectName: "Nora",
    projectRootPath: "/workspace/nora",
    brief: "brief should be ignored here",
    specPath: "specs/launch.md"
  });
  assert.match(instruction, /Use the spec at `specs\/launch\.md` as the source of truth/);
  assert.doesNotMatch(instruction, /brief should be ignored here/);
});
