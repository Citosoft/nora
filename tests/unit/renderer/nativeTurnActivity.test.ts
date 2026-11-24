import assert from "node:assert/strict";
import test from "node:test";
import { turnActivity } from "@shared/conversations/turnActivity";
import { buildNativeTimeline } from "@/components/app/logic/nativeTimeline";
import { TURN_WAITING_PHRASES } from "@shared/conversations/turnWaitingPhrases";
import { TURN_ACTIVITY_ORBS } from "@shared/conversations/turnActivityOrbs";
import type { ConversationRun, TimelineItem, ToolActivity } from "@shared/types/conversation/contracts.types";

const createdAt = "2026-11-10T10:00:00.000Z";
function run(state: ConversationRun["state"] = "running"): ConversationRun {
  return { id: "run", conversationId: "thread", instruction: "Work", state, attemptId: "attempt", nativeTurnId: null,
    createdAt, updatedAt: createdAt, failure: null, usage: null, review: "pending" };
}
const instruction: TimelineItem = { id: "instruction", runId: "run", createdAt, kind: "message", role: "user", text: "Work", complete: true };
const tool = (state: "running" | "completed"): ToolActivity => ({ id: `tool-${state}`, runId: "run", createdAt, kind: "tool", label: "Bash", state, output: "" });
const reasoning = (text: string, complete: boolean): TimelineItem => ({ id: "reasoning", runId: "run", createdAt, kind: "reasoning", text, complete });
const reply = (text: string, complete: boolean): TimelineItem => ({ id: "reply", runId: "run", createdAt, kind: "message", role: "assistant", text, complete });
const isWaiting = (label: string | undefined) => TURN_WAITING_PHRASES.some((phrase) => label === `${phrase}…`);

test("specific runtime states and in-progress thinking, including hidden thinking, are named", () => {
  assert.deepEqual(turnActivity(run("starting"), null), { kind: "starting", label: "Starting…" });
  assert.deepEqual(turnActivity(run("stopping"), tool("running")), { kind: "stopping", label: "Stopping…" });
  assert.deepEqual(turnActivity(run(), reasoning("Weighing", false)), { kind: "thinking", label: "Thinking…" });
  assert.deepEqual(turnActivity(run(), reasoning("", false)), { kind: "thinking", label: "Thinking…" });
});

test("streaming replies and running tools keep their live status", () => {
  assert.deepEqual(turnActivity(run(), tool("running")), { kind: "working", label: "Working…" });
  assert.deepEqual(turnActivity(run(), reply("Partial answer", false)), { kind: "composing", label: "Writing a reply…" });
});

test("turns waiting on the user or finished show no status, even with unfinished items", () => {
  for (const state of ["queued", "awaiting-approval", "awaiting-input", "completed", "failed", "interrupted", "recovering"] as const) {
    assert.equal(turnActivity(run(state), instruction), null);
    assert.equal(turnActivity(run(state), tool("running")), null);
    assert.equal(turnActivity(run(state), reply("Partial answer", false)), null);
  }
});

test("unexplained gaps get a filler phrase that stays the same until the turn moves on", () => {
  const afterInstruction = turnActivity(run(), instruction);
  assert.equal(afterInstruction?.kind, "waiting");
  assert.ok(isWaiting(afterInstruction?.label));
  assert.deepEqual(turnActivity(run(), instruction), afterInstruction);
  assert.ok(isWaiting(turnActivity(run(), tool("completed"))?.label));
  assert.ok(isWaiting(turnActivity(run(), reasoning("Done", true))?.label));
  assert.ok(isWaiting(turnActivity(run(), reply("", false))?.label));
});

test("the timeline attaches the status to the turn's last row only", () => {
  const rows = buildNativeTimeline([instruction, tool("completed")], [run()]);
  assert.equal(rows[0].activity, null);
  assert.equal(rows[1].activity?.kind, "waiting");
  assert.equal(buildNativeTimeline([instruction, tool("running")], [run()])[1].activity?.kind, "working");
});

test("normalized provider tool categories select the activity and orb", () => {
  const categories = ["search", "integration", "command", "file", "image", "agent", "wait", "other"] as const;
  for (const category of categories) {
    const activity = turnActivity(run(), { ...tool("running"), label: "Unrelated provider tool name", details: { category } });
    assert.ok(activity);
    const expected = category === "search" ? "searching" : category === "integration" ? "connecting" : "working";
    assert.equal(activity.kind, expected);
    assert.equal(TURN_ACTIVITY_ORBS[activity.kind], expected);
  }
  assert.equal(TURN_ACTIVITY_ORBS.thinking, "solving");
  assert.equal(TURN_ACTIVITY_ORBS.composing, "composing");
  for (const kind of ["starting", "stopping", "waiting"] as const) assert.equal(TURN_ACTIVITY_ORBS[kind], "working");
});

test("completed tools stop advertising their category and running agents retain progress", () => {
  const completed: TimelineItem = { id: "search", runId: "run", createdAt, kind: "tool", label: "Search", state: "completed", output: "", details: { category: "search" } };
  assert.equal(turnActivity(run(), completed)?.kind, "waiting");
  const agent: TimelineItem = { id: "agent", nativeId: "child", runId: "run", createdAt, kind: "subagent", label: "Review", state: "running" };
  assert.deepEqual(turnActivity(run(), agent), { kind: "working", label: "Agents are working…" });
  assert.equal(turnActivity(run(), { ...agent, state: "completed" })?.kind, "waiting");
});
