import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWorkspaceTaskBoard } from "@main/taskBoardStore";
import { createDefaultWorkspaceTaskBoard } from "@shared/appTypes";

test("boards saved with retired task assignments load without them and are marked for rewriting", () => {
  const { sections } = createDefaultWorkspaceTaskBoard();
  const saved = {
    version: 1,
    sections,
    taskPositions: { ".nora/tasks/a.md": { sectionId: "in-progress", order: 1 } },
    taskAssignments: { ".nora/tasks/a.md": [{ agentId: "agent", sessionId: "s", agentName: "Ada", toolId: "claude", toolLabel: "Claude", assignedAt: "2026-11-13T00:00:00.000Z" }] }
  };
  const { board, changed } = normalizeWorkspaceTaskBoard(saved);
  assert.equal(changed, true);
  assert.deepEqual(board, { version: 1, sections, taskPositions: saved.taskPositions });
  assert.equal(normalizeWorkspaceTaskBoard(board).changed, false);
});
