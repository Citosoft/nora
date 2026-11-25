import assert from "node:assert/strict";
import test from "node:test";
import { buildNativeTimeline } from "@/components/app/logic/nativeTimeline";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";

const createdAt = "2026-11-10T10:00:00.000Z";
const message = (id: string, role: "user" | "assistant", runId = "run"): TimelineItem =>
  ({ id, runId, createdAt, kind: "message", role, text: id, complete: true });
const tool = (id: string): TimelineItem => ({ id, runId: "run", createdAt, kind: "tool", label: "Read", state: "completed", output: "" });

test("agent messages that run straight into another agent message in the same turn are marked continued", () => {
  const rows = buildNativeTimeline([message("ask", "user"), message("a", "assistant"), tool("t1"), message("b", "assistant"),
    tool("t2"), message("c", "assistant")], []);
  // Later tool calls fold into the turn's first tool row, so a, b and c follow one another after it.
  assert.deepEqual(rows.map(({ key, continued }) => [key, continued]),
    [["ask", false], ["a", false], ["tools:run", false], ["b", true], ["c", false]]);
});

test("a turn's last agent message, user messages and messages before another turn are not continued", () => {
  const rows = buildNativeTimeline([message("ask", "user"), message("a", "assistant"), message("next", "assistant", "other")], []);
  assert.deepEqual(rows.map(({ continued }) => continued), [false, false, false]);
});

test("unsupported Git review does not add a transcript row", () => {
  const rows = buildNativeTimeline([message("answer", "assistant"),
    { id: "review", runId: "run", createdAt, kind: "review", result: { status: "unavailable", reason: "unsupported" } }], []);
  assert.deepEqual(rows.map(({ key }) => key), ["answer"]);
});
