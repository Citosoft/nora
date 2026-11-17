import assert from "node:assert/strict";
import test from "node:test";
import { formatTaskHandoffInstruction } from "@/components/app/logic/taskHandoff";

test("task handoffs reference the Nora skill and stable id without filesystem instructions", () => {
  assert.equal(formatTaskHandoffInstruction(".nora/tasks/fix-login-abc.md"), 'Use the nora skill to work on task "fix-login-abc".');
  assert.equal(formatTaskHandoffInstruction(".nora/tasks/completed/fix-login-abc.md"), formatTaskHandoffInstruction(".nora/tasks/fix-login-abc.md"));
});
