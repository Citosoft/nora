import assert from "node:assert/strict";
import test from "node:test";
import { openTaskLink } from "@/components/app/logic/openTaskLink";
import type { WorkspaceTaskSummary } from "@shared/appTypes";

const task = (path: string): WorkspaceTaskSummary => ({ path, title: "Release", completed: path.includes("completed/"), updatedAt: null });

test("task links open the resolved task directly, leaving workspace selection to the editor", async () => {
  const calls: string[] = [];
  await openTaskLink({ projectId: "project", taskId: "release" }, {
    listTasks: async (projectId) => { calls.push(`list:${projectId}`); return [task(".nora/tasks/release.md")]; },
    openTaskEditor: async (projectId, path) => { calls.push(`open:${projectId}:${path}`); }
  });
  assert.deepEqual(calls, ["list:project", "open:project:.nora/tasks/release.md"]);
});

test("links resolve completed tasks in the owning project rather than the thread checkout", async () => {
  const calls: string[] = [];
  await openTaskLink({ projectId: "owning-project", taskId: "release" }, {
    listTasks: async (projectId) => { assert.equal(projectId, "owning-project"); return [task(".nora/tasks/completed/release.md")]; },
    openTaskEditor: async (projectId, path) => { calls.push(`${projectId}:${path}`); }
  });
  assert.deepEqual(calls, ["owning-project:.nora/tasks/completed/release.md"]);
});

test("missing and ambiguous links fail before opening an editor", async () => {
  for (const tasks of [[], [task(".nora/tasks/release.md"), task(".nora/tasks/completed/release.md")]]) {
    await assert.rejects(openTaskLink({ projectId: "project", taskId: "release" }, {
      listTasks: async () => tasks,
      openTaskEditor: async () => { assert.fail("Invalid task links must not open an editor."); }
    }), tasks.length ? /ambiguous/ : /no longer available/);
  }
});

test("task lookup and editor failures propagate to the caller's error handler", async () => {
  await assert.rejects(openTaskLink({ projectId: "project", taskId: "release" }, {
    listTasks: async () => { throw new Error("Workspace unavailable"); },
    openTaskEditor: async () => { assert.fail("Lookup failed"); }
  }), /Workspace unavailable/);
  await assert.rejects(openTaskLink({ projectId: "project", taskId: "release" }, {
    listTasks: async () => [task(".nora/tasks/release.md")],
    openTaskEditor: async () => { throw new Error("Editor unavailable"); }
  }), /Editor unavailable/);
});
