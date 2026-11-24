import assert from "node:assert/strict";
import test from "node:test";
import { summarizeToolHistory } from "@shared/conversations/toolHistory";
import type { ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";

function tool(id: string, state: ToolState = "completed", runId = "turn"): ToolActivity {
  return { id, runId, kind: "tool", label: id, state, output: `Output ${id}`, createdAt: "2026-11-10T10:00:00.000Z" };
}

test("the activity line follows the latest running action and retains failures in its summary", () => {
  const items = [tool("first", "running"), tool("second", "running"), tool("failed", "failed")];
  assert.deepEqual(summarizeToolHistory(items), { label: "second", state: "running", count: 3, failedCount: 1 });
  assert.equal(summarizeToolHistory([tool("first"), tool("second", "running")]).label, "second");
  assert.deepEqual(summarizeToolHistory([tool("first"), tool("second")]), { label: "2 tool calls", state: "completed", count: 2, failedCount: 0 });
  assert.equal(summarizeToolHistory([tool("single")]).label, "1 tool call");
  for (const state of ["failed", "unconfirmed", "interrupted", "declined"] as const) {
    assert.equal(summarizeToolHistory([tool("problem", state), tool("done")]).state, state);
  }
});
