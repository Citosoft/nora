import {
  dataTransferDeclaresWorkspaceRelativePath,
  dataTransferDeclaresPathOrFileDrop,
  formatWorkspacePathReference,
  NORA_WORKSPACE_RELATIVE_PATH_MIME,
  readWorkspaceRelativePathFromDataTransfer,
  setWorkspaceRelativePathDragData
} from "@/components/app/logic/workspacePathDrag";
import assert from "node:assert/strict";
import test from "node:test";

test("formatWorkspacePathReference adds trailing slash for non-root directories", () => {
  assert.equal(formatWorkspacePathReference("src/components", "directory"), "src/components/");
  assert.equal(formatWorkspacePathReference("src/foo.ts", "file"), "src/foo.ts");
});

test("setWorkspaceRelativePathDragData and read round-trip", () => {
  const store: Record<string, string> = {};
  const dt = {
    effectAllowed: "uninitialized" as DataTransfer["effectAllowed"],
    setData(type: string, value: string) {
      store[type] = value;
    },
    getData(type: string) {
      return store[type] ?? "";
    }
  } as unknown as DataTransfer;

  setWorkspaceRelativePathDragData(dt, "lib/util.ts", "file");
  assert.equal(readWorkspaceRelativePathFromDataTransfer(dt), "lib/util.ts");
  assert.equal(dt.getData("text/plain"), "lib/util.ts");
  assert.equal(dt.getData(NORA_WORKSPACE_RELATIVE_PATH_MIME), "lib/util.ts");
});

test("dataTransferDeclaresPathOrFileDrop uses types (getData empty during dragover)", () => {
  const dt = {
    types: ["Files"],
    getData: () => ""
  } as unknown as DataTransfer;
  assert.equal(dataTransferDeclaresPathOrFileDrop(dt), true);

  const dt2 = {
    types: [NORA_WORKSPACE_RELATIVE_PATH_MIME, "text/plain"],
    getData: () => ""
  } as unknown as DataTransfer;
  assert.equal(dataTransferDeclaresPathOrFileDrop(dt2), true);
  assert.equal(dataTransferDeclaresWorkspaceRelativePath(dt2), true);

  const dt3 = {
    types: ["text/plain"],
    getData: () => ""
  } as unknown as DataTransfer;
  assert.equal(dataTransferDeclaresPathOrFileDrop(dt3), false);
  assert.equal(dataTransferDeclaresWorkspaceRelativePath(dt3), false);
});
