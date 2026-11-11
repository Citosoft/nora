import assert from "node:assert/strict";
import test from "node:test";
import { formatTurnTime, isTurnTimerRunning, turnElapsedSeconds } from "@/components/app/logic/nativeTurnTime";
import { applyNativeEvent } from "@/components/app/logic/nativeConversationState";
import { loadNativeRunHistory } from "@/components/app/logic/nativeRunHistory";
import { buildNativeTimeline } from "@/components/app/logic/nativeTimeline";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import type { ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { NativeConversationView } from "@/components/app/types/nativeConversation.types";

const start = "2026-11-10T10:00:00.000Z";
function run(id = "run", state: ConversationRun["state"] = "running"): ConversationRun {
  return { id, conversationId: "existing", instruction: "Work", state, attemptId: "attempt", nativeTurnId: null,
    createdAt: "2026-11-10T09:00:00.000Z", updatedAt: "2026-11-10T10:01:05.000Z", failure: null, usage: null, review: "pending" };
}
const message: TimelineItem = { id: "instruction", runId: "run", createdAt: start, kind: "message", role: "user", text: "Work", complete: true };

test("timing appears once per turn, including paginated history without the instruction", () => {
  const tool: TimelineItem = { id: "tool", runId: "run", kind: "tool", label: "Work", state: "running", output: "", createdAt: start };
  const rows = buildNativeTimeline([message, tool], [run()]);
  assert.equal(rows[0].timing, null);
  assert.equal(rows[1].timing?.startedAt, start);
  const paginated = buildNativeTimeline([tool], [{ ...run(), startedAt: start }]);
  assert.equal(paginated[0].timing?.startedAt, start);
});

test("turn time excludes queue wait, ticks while active and freezes at the execution outcome", () => {
  const now = Date.parse("2026-11-10T10:02:00.000Z");
  assert.equal(turnElapsedSeconds(run(), start, now), 120);
  assert.equal(turnElapsedSeconds(run(), start, now + 1000), 121);
  for (const state of ["completed", "failed", "interrupted"] as const) {
    assert.equal(isTurnTimerRunning(state), false);
    assert.equal(turnElapsedSeconds(run("run", state), start, now), 65);
    assert.equal(turnElapsedSeconds(run("run", state), start, now + 100_000), 65);
  }
  assert.equal(isTurnTimerRunning("queued"), false);
  assert.equal(isTurnTimerRunning("awaiting-input"), true);
  assert.equal(turnElapsedSeconds(run(), start, Date.parse(start) - 1000), 0);
  assert.deepEqual([0, 59, 60, 65, 3600, 3661].map(formatTurnTime), ["0s", "59s", "1m 0s", "1m 5s", "1h 0m 0s", "1h 1m 1s"]);
});

test("turn history pages its own cursors until the loaded timeline is covered and preserves live run versions", async () => {
  const f = threadWorkspaceFixture();
  const positions: (number | undefined)[] = [];
  const client = { ...f.deps.client, history: async (query: Parameters<typeof f.deps.client.history>[0]) => {
    assert.equal(query.scope, "runs"); positions.push(query.before);
    return { schemaVersion: 1 as const, conversationId: "existing", scope: "runs" as const, cursor: 1,
      runs: query.before === undefined ? [run("newer")] : [run("run", "completed")], nextBefore: query.before === undefined ? 42 : null };
  } };
  const history = await loadNativeRunHistory(client, "existing", [message]);
  assert.deepEqual(positions, [undefined, 42]);
  assert.equal(history.runs.find((entry) => entry.id === "run")?.state, "completed");
  positions.length = 0;
  const existing = { runs: [run("newer", "completed")], nextBefore: 42 };
  const older = await loadNativeRunHistory(client, "existing", [message], existing);
  assert.deepEqual(positions, [42]);
  assert.equal(older.runs.find((entry) => entry.id === "newer")?.state, "completed");
});

test("run completion and review events retain final timing in the view", async () => {
  const f = threadWorkspaceFixture(); const header = await f.deps.client.header("existing"); assert.ok(header);
  const view: NativeConversationView = { header, items: [message], nextBefore: null, runHistory: { runs: [run()], nextBefore: null } };
  const finished = run("run", "completed");
  const event = { schemaVersion: 1 as const, id: "done", conversationId: "existing", cursor: 1, at: finished.updatedAt,
    payload: { kind: "run" as const, run: finished } };
  const completed = applyNativeEvent(view, event);
  assert.equal(completed.header.activeRuns.length, 0);
  assert.equal(completed.runHistory.runs[0].state, "completed");
  assert.equal(view.runHistory.runs[0].state, "running");
  const reviewed = applyNativeEvent(completed, { ...event, cursor: 2, payload: { kind: "run", run: { ...finished, review: "ready" } } });
  assert.equal(reviewed.runHistory.runs.length, 1);
  assert.equal(turnElapsedSeconds(reviewed.runHistory.runs[0], start, Date.now()), 65);
});
