import assert from "node:assert/strict";
import test from "node:test";
import { selectUpcomingTasks } from "@/components/app/logic/workspace-home/upcomingTasks";
import { createDefaultWorkspaceTaskBoard } from "@shared/appTypes";
import type { WorkspaceTaskSummary } from "@shared/appTypes";

const task = (path: string, overrides: Partial<WorkspaceTaskSummary> = {}): WorkspaceTaskSummary => ({ path, title: path, updatedAt: null, completed: false, ...overrides });

test("upcoming tasks follow board order, skip completed ones and count the rest", () => {
  const board = { ...createDefaultWorkspaceTaskBoard(), taskPositions: {
    doing: { sectionId: "in-progress", order: 0 }, first: { sectionId: "todo", order: 0 }, second: { sectionId: "todo", order: 1 } } };
  const result = selectUpcomingTasks([task("doing"), task("second"), task("done", { completed: true }), task("first"), task("loose")], board, 3);
  assert.deepEqual(result.tasks.map((entry) => [entry.task.path, entry.sectionTitle]), [["first", "Todo"], ["second", "Todo"], ["loose", "Todo"]]);
  assert.equal(result.more, 1);
});
