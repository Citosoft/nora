import {
  dataTransferDeclaresTaskDrop,
  NORA_WORKSPACE_TASK_MIME,
  readWorkspaceTaskFromDataTransfer,
  setWorkspaceTaskDragData
} from "@/components/app/logic/workspaceTaskDrag";
import assert from "node:assert/strict";
import test from "node:test";

test("setWorkspaceTaskDragData and read round-trip", () => {
  const store: Record<string, string> = {};
  const types: string[] = [];
  const dt = {
    effectAllowed: "uninitialized" as DataTransfer["effectAllowed"],
    types,
    setData(type: string, value: string) {
      store[type] = value;
      if (!types.includes(type)) {
        types.push(type);
      }
    },
    getData(type: string) {
      return store[type] ?? "";
    }
  } as unknown as DataTransfer;

  setWorkspaceTaskDragData(dt, {
    projectRootPath: "/repo",
    taskPath: ".nora/tasks/task-123.md",
    taskTitle: "Ship feature"
  });

  assert.equal(dt.getData("text/plain"), "Ship feature");
  assert.equal(dt.effectAllowed, "copy");
  assert.deepEqual(readWorkspaceTaskFromDataTransfer(dt), {
    projectRootPath: "/repo",
    taskPath: ".nora/tasks/task-123.md",
    taskTitle: "Ship feature"
  });
});

test("readWorkspaceTaskFromDataTransfer returns null for invalid payloads", () => {
  const dt = {
    getData: () => "{\"taskPath\":\"x\"}"
  } as unknown as DataTransfer;
  assert.equal(readWorkspaceTaskFromDataTransfer(dt), null);
});

test("dataTransferDeclaresTaskDrop checks drag types", () => {
  const dt = {
    types: [NORA_WORKSPACE_TASK_MIME, "text/plain"]
  } as unknown as DataTransfer;
  assert.equal(dataTransferDeclaresTaskDrop(dt), true);

  const dt2 = {
    types: ["text/plain"]
  } as unknown as DataTransfer;
  assert.equal(dataTransferDeclaresTaskDrop(dt2), false);
});
