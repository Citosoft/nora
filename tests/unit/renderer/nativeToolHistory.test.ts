import assert from "node:assert/strict";
import test from "node:test";
import { groupNativeToolHistory, summarizeNativeToolHistory } from "@/components/app/logic/nativeToolHistory";
import type { TimelineItem, ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";

function tool(id: string, state: ToolState = "completed", runId = "turn"): ToolActivity {
  return { id, runId, kind: "tool", label: id, state, output: `Output ${id}`, createdAt: "2026-11-10T10:00:00.000Z" };
}

test("tool history groups an entire turn across messages without combining turns or dropping details", () => {
  const message: TimelineItem = { id: "message", runId: "turn", kind: "message", role: "assistant", text: "Checking", complete: true, createdAt: "2026-11-10T10:00:00.000Z" };
  const first = tool("first"); const nested = { ...tool("nested"), details: { category: "command" as const, parentId: "first", input: "ls" } };
  const next = tool("next", "running", "next-turn");
  const entries = groupNativeToolHistory([first, message, nested, next]);
  assert.deepEqual(entries, [{ kind: "tools", runId: "turn", items: [first, nested] }, { kind: "item", item: message }, { kind: "tools", runId: "next-turn", items: [next] }]);
  assert.deepEqual(groupNativeToolHistory([]), []);
});

test("the activity line follows the latest running action and retains failures in its summary", () => {
  const items = [tool("first", "running"), tool("second", "running"), tool("failed", "failed")];
  assert.deepEqual(summarizeNativeToolHistory(items), { label: "second", state: "running", count: 3, failedCount: 1 });
  assert.equal(summarizeNativeToolHistory([tool("first"), tool("second", "running")]).label, "second");
  assert.deepEqual(summarizeNativeToolHistory([tool("first"), tool("second")]), { label: "2 tool calls", state: "completed", count: 2, failedCount: 0 });
  assert.equal(summarizeNativeToolHistory([tool("single")]).label, "1 tool call");
  for (const state of ["failed", "unconfirmed", "interrupted", "declined"] as const) {
    assert.equal(summarizeNativeToolHistory([tool("problem", state), tool("done")]).state, state);
  }
});
