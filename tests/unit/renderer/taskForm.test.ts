import { buildTaskContent } from "@/components/app/logic/taskForm";
import { deriveTaskTitle } from "@shared/taskDraft";
import assert from "node:assert/strict";
import test from "node:test";

test("buildTaskContent saves populated fields in the task Markdown format", () => {
  const content = buildTaskContent({
    title: "  Improve startup  ",
    goal: "  Open the workspace faster.  ",
    context: "See `main/startup.ts`.\n\nhttps://example.com/notes",
    definitionOfDone: "- Workspace opens\n- Existing sessions resume"
  });
  assert.equal(content, "# Improve startup\n\n## Goal\n\nOpen the workspace faster.\n\n## Context\n\nSee `main/startup.ts`.\n\nhttps://example.com/notes\n\n## Definition of done\n\n- Workspace opens\n- Existing sessions resume\n");
  assert.equal(deriveTaskTitle(content, "Fallback"), "Improve startup");
});

test("buildTaskContent keeps optional fields empty instead of saving template instructions", () => {
  assert.equal(buildTaskContent({ title: "Task", goal: "", context: "", definitionOfDone: "" }),
    "# Task\n\n## Goal\n\n\n\n## Context\n\n\n\n## Definition of done\n\n\n");
});

test("buildTaskContent rejects blank titles and keeps the title on one line", () => {
  assert.throws(() => buildTaskContent({ title: " \n ", goal: "", context: "", definitionOfDone: "" }), /Enter a task title/);
  assert.match(buildTaskContent({ title: "First\nSecond", goal: "", context: "", definitionOfDone: "" }), /^# First Second\n/);
});
