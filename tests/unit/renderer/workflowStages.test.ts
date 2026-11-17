import assert from "node:assert/strict";
import test from "node:test";
import { moveWorkflowStage, newWorkflowStage } from "@/components/app/logic/workflowStages";

test("reordering preserves stage identities and bot assignments without mutating the source", () => {
  const stages = [newWorkflowStage("claude", 1), { ...newWorkflowStage("codex", 2), botId: "qa-bot" }, newWorkflowStage("claude", 3)];
  const reordered = moveWorkflowStage(stages, 1, -1);
  assert.deepEqual(reordered.map((entry) => entry.id), [stages[1].id, stages[0].id, stages[2].id]);
  assert.equal(reordered[0].botId, "qa-bot");
  assert.notEqual(stages[0].id, reordered[0].id);
  assert.deepEqual(moveWorkflowStage(stages, 0, -1), stages);
  assert.deepEqual(moveWorkflowStage(stages, 2, 1), stages);
});
