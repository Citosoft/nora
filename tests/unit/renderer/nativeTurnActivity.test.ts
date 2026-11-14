import assert from "node:assert/strict";
import test from "node:test";
import { nativeTurnActivity } from "@/components/app/logic/nativeTurnActivity";
import { buildNativeTimeline } from "@/components/app/logic/nativeTimeline";
import { TURN_WAITING_PHRASES } from "@/components/app/constants/turnWaitingPhrases";
import type { ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";

const createdAt = "2026-11-10T10:00:00.000Z";
function run(state: ConversationRun["state"] = "running"): ConversationRun {
  return { id: "run", conversationId: "thread", instruction: "Work", state, attemptId: "attempt", nativeTurnId: null,
    createdAt, updatedAt: createdAt, failure: null, usage: null, review: "pending" };
}
const instruction: TimelineItem = { id: "instruction", runId: "run", createdAt, kind: "message", role: "user", text: "Work", complete: true };
const tool = (state: "running" | "completed"): TimelineItem => ({ id: `tool-${state}`, runId: "run", createdAt, kind: "tool", label: "Bash", state, output: "" });
const reasoning = (text: string, complete: boolean): TimelineItem => ({ id: "reasoning", runId: "run", createdAt, kind: "reasoning", text, complete });
const reply = (text: string, complete: boolean): TimelineItem => ({ id: "reply", runId: "run", createdAt, kind: "message", role: "assistant", text, complete });
const isWaiting = (label: string | undefined) => TURN_WAITING_PHRASES.some((phrase) => label === `${phrase}…`);

test("specific runtime states and in-progress thinking, including hidden thinking, are named", () => {
  assert.deepEqual(nativeTurnActivity(run("starting"), null), { kind: "starting", label: "Starting…" });
  assert.deepEqual(nativeTurnActivity(run("stopping"), tool("running")), { kind: "stopping", label: "Stopping…" });
  assert.deepEqual(nativeTurnActivity(run(), reasoning("Weighing", false)), { kind: "thinking", label: "Thinking…" });
  assert.deepEqual(nativeTurnActivity(run(), reasoning("", false)), { kind: "thinking", label: "Thinking…" });
});

test("rows that already show progress, and turns waiting on the user or finished, show no status", () => {
  assert.equal(nativeTurnActivity(run(), tool("running")), null);
  assert.equal(nativeTurnActivity(run(), reply("Partial answer", false)), null);
  for (const state of ["queued", "awaiting-approval", "awaiting-input", "completed", "failed", "interrupted", "recovering"] as const) {
    assert.equal(nativeTurnActivity(run(state), instruction), null);
  }
});

test("unexplained gaps get a filler phrase that stays the same until the turn moves on", () => {
  const afterInstruction = nativeTurnActivity(run(), instruction);
  assert.equal(afterInstruction?.kind, "waiting");
  assert.ok(isWaiting(afterInstruction?.label));
  assert.deepEqual(nativeTurnActivity(run(), instruction), afterInstruction);
  assert.ok(isWaiting(nativeTurnActivity(run(), tool("completed"))?.label));
  assert.ok(isWaiting(nativeTurnActivity(run(), reasoning("Done", true))?.label));
  assert.ok(isWaiting(nativeTurnActivity(run(), reply("", false))?.label));
});

test("the timeline attaches the status to the turn's last row only", () => {
  const rows = buildNativeTimeline([instruction, tool("completed")], [run()]);
  assert.equal(rows[0].activity, null);
  assert.equal(rows[1].activity?.kind, "waiting");
  assert.equal(buildNativeTimeline([instruction, tool("running")], [run()])[1].activity, null);
});
