import assert from "node:assert/strict";
import test from "node:test";
import { filterTasks } from "@/components/app/logic/filterTasks";
import type { WorkspaceTaskSummary } from "@shared/appTypes";

const tasks: WorkspaceTaskSummary[] = [
  {
    title: "Ship search",
    path: ".nora/tasks/search.md",
    completed: false,
    updatedAt: null
  },
  {
    title: "Fix login",
    path: ".nora/tasks/auth.md",
    completed: true,
    updatedAt: null
  },
  {
    title: "Write docs",
    path: ".nora/tasks/docs.md",
    completed: false,
    updatedAt: null
  }
];

test("task status filters separate open and completed tasks without changing the source", () => {
  assert.deepEqual(filterTasks(tasks, "", "open"), [tasks[0], tasks[2]]);
  assert.deepEqual(filterTasks(tasks, "", "completed"), [tasks[1]]);
  assert.deepEqual(filterTasks(tasks, "", "all"), tasks);
  assert.equal(tasks.length, 3);
});

test("task search matches trimmed titles and paths regardless of case, within the chosen status", () => {
  assert.deepEqual(filterTasks(tasks, " SHIP ", "open"), [tasks[0]]);
  assert.deepEqual(filterTasks(tasks, "AUTH.md", "all"), [tasks[1]]);
  assert.deepEqual(filterTasks(tasks, "auth", "open"), []);
  assert.deepEqual(filterTasks(tasks, "   ", "completed"), [tasks[1]]);
  assert.deepEqual(filterTasks([], "search", "all"), []);
});
