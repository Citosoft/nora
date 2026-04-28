import {
  getCachedTerminalViewportSize,
  setCachedTerminalViewportSize
} from "@/components/app/logic/terminalViewportSizeCache";
import assert from "node:assert/strict";
import test from "node:test";

test("terminal viewport size cache stores sizes by session id", () => {
  assert.equal(getCachedTerminalViewportSize("session-a"), null);

  setCachedTerminalViewportSize("session-a", { cols: 120, rows: 36 });
  setCachedTerminalViewportSize("session-b", { cols: 100, rows: 30 });

  assert.deepEqual(getCachedTerminalViewportSize("session-a"), { cols: 120, rows: 36 });
  assert.deepEqual(getCachedTerminalViewportSize("session-b"), { cols: 100, rows: 30 });
});
