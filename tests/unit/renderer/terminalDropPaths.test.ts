import {
  getAbsolutePathStringsForTerminalDrop,
  quotePathForShellInsertion
} from "@/components/app/logic/terminalDropPaths";
import { NORA_WORKSPACE_RELATIVE_PATH_MIME } from "@/components/app/logic/workspacePathDrag";
import assert from "node:assert/strict";
import test from "node:test";

test("quotePathForShellInsertion wraps paths with whitespace", () => {
  assert.equal(quotePathForShellInsertion("/tmp/a.ts"), "/tmp/a.ts");
  assert.equal(quotePathForShellInsertion("/tmp/a b/c.ts"), '"/tmp/a b/c.ts"');
});

test("getAbsolutePathStringsForTerminalDrop resolves nora drag data", () => {
  const store: Record<string, string> = {};
  const dt = {
    getData(type: string) {
      return store[type] ?? "";
    }
  } as unknown as DataTransfer;

  store[NORA_WORKSPACE_RELATIVE_PATH_MIME] = "src/x.ts";
  assert.deepEqual(getAbsolutePathStringsForTerminalDrop(dt, "/tmp/ws"), ["/tmp/ws/src/x.ts"]);
});
