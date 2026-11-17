import assert from "node:assert/strict";
import test from "node:test";
import { rememberCall, rememberCallIsFresh } from "@/components/app/logic/rememberCalls";
import { groupNativeTimelineEntries } from "@/components/app/logic/nativeTimeline";
import type { ToolActivity, TimelineItem } from "@shared/types/conversation/contracts.types";

const tool = (id: string, label: string, extra: Partial<ToolActivity> = {}): ToolActivity => ({ kind: "tool", id, runId: "r", createdAt: "", label, output: "", state: "completed",
  details: { category: "integration" }, ...extra });
const shape = (call: ReturnType<typeof rememberCall>) => call && [call.text, call.updated, call.workspace];

test("remember calls from Claude and Codex become memory lines with the note, scope and whether it was an update", () => {
  assert.deepEqual(shape(rememberCall(tool("a", "mcp__nora__remember", { details: { category: "integration", input: JSON.stringify({ text: "Ship on Tuesdays", scope: "workspace" }) } }))),
    ["Ship on Tuesdays", false, true]);
  assert.deepEqual(shape(rememberCall(tool("b", "remember", { state: "running", details: { category: "integration", detail: "nora", input: JSON.stringify({ text: "Ship on Weds", memory_id: "m1", scope: "workspace" }) } }))),
    ["Ship on Weds", true, false]);
  assert.deepEqual(shape(rememberCall(tool("c", "remember", { details: { category: "integration", detail: "nora", input: "{\"memory_id\": \"m1\", \"text\": \"long… input truncated" } }))),
    [null, true, false]);
});

test("failed, declined and foreign remember calls stay ordinary tool activity", () => {
  assert.equal(rememberCall(tool("a", "mcp__nora__remember", { state: "failed" })), null);
  assert.equal(rememberCall(tool("b", "mcp__nora__remember", { state: "declined" })), null);
  assert.equal(rememberCall(tool("c", "remember", { details: { category: "integration", detail: "other" } })), null);
  assert.equal(rememberCall(tool("d", "mcp__nora__recall")), null);
});

test("remember calls get their own timeline entry; other tools still group per turn", () => {
  const items: TimelineItem[] = [tool("1", "Read"), tool("2", "mcp__nora__remember", { details: { category: "integration", input: "{\"text\":\"x\"}" } }), tool("3", "Grep")];
  assert.deepEqual(groupNativeTimelineEntries(items).map((entry) => entry.kind === "tools" ? `tools:${entry.items.map((item) => item.id).join(",")}` : entry.kind),
    ["tools:1,3", "memory"]);
});

test("only notes saved moments ago play the reveal", () => {
  const call = rememberCall(tool("a", "mcp__nora__remember", { createdAt: "2026-11-16T10:00:00.000Z" }));
  assert.ok(call);
  assert.equal(rememberCallIsFresh(call, Date.parse("2026-11-16T10:00:05.000Z")), true);
  assert.equal(rememberCallIsFresh(call, Date.parse("2026-11-16T10:05:00.000Z")), false);
  assert.equal(rememberCallIsFresh({ ...call, tool: { ...call.tool, createdAt: "" } }, Date.now()), false);
});
