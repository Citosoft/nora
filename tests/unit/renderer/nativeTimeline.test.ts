import assert from "node:assert/strict";
import test from "node:test";
import { groupNativeTimelineEntries } from "@/components/app/logic/nativeTimeline";
import type { TimelineItem, ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import type { ReasoningActivity } from "@/components/app/types/nativeActivity.types";

const createdAt = "2026-11-10T10:00:00.000Z";

function tool(id: string, state: ToolState = "completed", runId = "turn"): ToolActivity {
  return { id, runId, kind: "tool", label: id, state, output: `Output ${id}`, createdAt };
}

function reasoning(id: string, runId = "turn"): ReasoningActivity {
  return { id, runId, kind: "reasoning", text: `Thinking ${id}`, complete: true, createdAt };
}

function message(id: string, runId = "turn"): TimelineItem {
  return { id, runId, kind: "message", role: "assistant", text: id, complete: true, createdAt };
}

test("tool history groups an entire turn across messages without combining turns or dropping details", () => {
  const reply = message("message");
  const first = tool("first"); const nested = { ...tool("nested"), details: { category: "command" as const, parentId: "first", input: "ls" } };
  const next = tool("next", "running", "next-turn");
  const entries = groupNativeTimelineEntries([first, reply, nested, next]);
  assert.deepEqual(entries, [{ kind: "tools", runId: "turn", items: [first, nested] }, { kind: "item", item: reply }, { kind: "tools", runId: "next-turn", items: [next] }]);
  assert.deepEqual(groupNativeTimelineEntries([]), []);
});

test("consecutive reasoning merges into one row, including across folded tool calls, but not across messages or turns", () => {
  const [a, b, c, d, e] = [reasoning("a"), reasoning("b"), reasoning("c"), reasoning("d"), reasoning("e", "next-turn")];
  const first = tool("first"); const second = tool("second"); const reply = message("reply");
  const entries = groupNativeTimelineEntries([first, a, second, b, c, reply, d, e]);
  assert.deepEqual(entries, [
    { kind: "tools", runId: "turn", items: [first, second] },
    { kind: "reasoning", runId: "turn", items: [a, b, c] },
    { kind: "item", item: reply },
    { kind: "reasoning", runId: "turn", items: [d] },
    { kind: "reasoning", runId: "next-turn", items: [e] },
  ]);
});
