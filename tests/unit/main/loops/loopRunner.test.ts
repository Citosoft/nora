import assert from "node:assert/strict";
import test from "node:test";
import { loopFixture, until, workflowResult, stage, definition } from "./fixture";

const prepared = { worktreePath: "/tmp/workflow", worktreeId: "tree", sessionId: "session" };

test("workflow stages execute in threads, retain output and broadcast saved definitions", async (t) => {
  const f = loopFixture(); t.after(() => f.runner.dispose());
  const run = await f.start();
  await until(() => f.runs.get(run.id)?.status === "completed");
  assert.ok(f.runs.get(run.id)?.roles[0].conversationId);
  assert.ok(f.runs.get(run.id)?.outputEvents.some((event) => event.kind === "result"));
  const next = await f.start();
  await until(() => f.runs.get(next.id)?.status === "completed");
  assert.notEqual(f.branches[0], f.branches[1]);
  const saved = await f.runner.saveDefinition({ projectId: "project", definition: { ...f.definition, name: "Renamed" } });
  assert.deepEqual(f.broadcasts, [saved]);
});

test("polling a live setup does not report an orphaned workflow", async (t) => {
  let release = () => {};
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  const f = loopFixture({ prepareWorktree: async () => { await waiting; return prepared; } });
  t.after(() => f.runner.dispose());
  const starting = f.start();
  await until(() => f.runs.size > 0);
  const id = [...f.runs.keys()][0];
  assert.equal((await f.runner.getRun("project", id))?.status, "preparing");
  assert.equal((await f.runner.listRuns("project"))[0].status, "preparing");
  release(); await starting;
  await until(() => f.runs.get(id)?.status === "completed");
});

for (const phase of ["checkout", "threads"] as const) {
  test(`cancelling during ${phase} preparation never launches a stage`, async (t) => {
    let release = () => {}, preparing = false, turns = 0;
    const waiting = new Promise<void>((resolve) => { release = resolve; });
    const f = loopFixture({
      prepareWorktree: async () => { if (phase === "checkout") { preparing = true; await waiting; } return prepared; },
      prepare: async (run) => { if (phase === "threads") { preparing = true; await waiting; } return run.roles; },
      execute: async () => { turns++; throw new Error("Must never execute"); }
    });
    t.after(() => f.runner.dispose());
    const starting = f.start(); await until(() => preparing);
    const id = [...f.runs.keys()][0];
    assert.equal((await f.runner.cancelRun("project", id)).status, "cancelled");
    release(); await starting;
    assert.equal(f.runs.get(id)?.status, "cancelled");
    assert.equal(turns, 0);
    assert.equal(f.runs.get(id)?.activeRoleId, null);
  });
}

for (const status of ["failed", "interrupted", "timed-out"] as const) {
  test(`a ${status} thread cannot complete a stage even with a recorded stage result`, async (t) => {
    const f = loopFixture({ execute: async ({ prompt }) => ({ status, ...workflowResult(prompt), failure: "Runtime did not succeed" }) });
    t.after(() => f.runner.dispose());
    const run = await f.start(); await until(() => f.runs.get(run.id)?.status === "paused");
    assert.equal(f.runs.get(run.id)?.iterations[0].results.length, 0);
    assert.match(f.runs.get(run.id)?.stopReason ?? "", /Runtime did not succeed/);
  });
}

test("turn deadlines are bounded by the remaining total runtime", async (t) => {
  let timeout = 0;
  const f = loopFixture({ execute: async ({ prompt, timeoutMs }) => {
    timeout = timeoutMs; return { status: "completed", ...workflowResult(prompt), failure: null };
  } }); t.after(() => f.runner.dispose());
  const run = await f.start(); await until(() => f.runs.get(run.id)?.status === "completed");
  assert.ok(timeout > 0 && timeout <= 300_000);
  assert.ok(timeout < f.definition.limits.roleTimeoutMs);
});

test("a result returned after the total deadline cannot complete a run", async (t) => {
  const f = loopFixture({ nowIso: () => new Date(Date.now() - 299_950).toISOString(), execute: async ({ prompt }) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 75));
    return { status: "completed", ...workflowResult(prompt), failure: null };
  } }); t.after(() => f.runner.dispose());
  const run = await f.start(); await until(() => f.runs.get(run.id)?.status === "paused");
  assert.match(f.runs.get(run.id)?.stopReason ?? "", /duration limit/);
});

test("pausing an intermediate thread resumes there without repeating accepted stages", async (t) => {
  let calls = 0, aborted = false;
  const f = loopFixture({ definition: definition([stage("implement"), stage("qa"), stage("review", "reviewer")]),
    execute: async ({ prompt, signal }) => {
      calls++;
      if (calls === 2) {
        await new Promise<void>((resolve) => { signal.addEventListener("abort", () => { aborted = true; resolve(); }, { once: true }); if (signal.aborted) resolve(); });
        return { status: "interrupted", output: "", failure: null };
      }
      return { status: "completed", ...workflowResult(prompt, calls === 4 ? "approve" : "complete"), failure: null };
    } }); t.after(() => f.runner.dispose());
  const run = await f.start(); await until(() => calls === 2);
  await f.runner.pauseRun("project", run.id); await until(() => f.runs.get(run.id)?.status === "paused");
  assert.ok(aborted);
  await f.runner.resumeRun("project", run.id); await until(() => f.runs.get(run.id)?.status === "completed");
  assert.equal(calls, 4);
  assert.equal(f.runs.get(run.id)?.iterations.length, 1);
  assert.equal((await f.runner.cancelRun("project", run.id)).status, "completed");
});

test("deleting a live run is refused and deleting a stopped run succeeds", async (t) => {
  const f = loopFixture(); t.after(() => f.runner.dispose());
  const run = await f.start(); await until(() => f.runs.get(run.id)?.status === "completed");
  await f.store.saveRun({ ...f.runs.get(run.id)!, status: "running" });
  await assert.rejects(f.runner.deleteRun("project", run.id), /Pause or cancel/);
  await f.store.saveRun({ ...f.runs.get(run.id)!, status: "paused" });
  await f.runner.deleteRun("project", run.id);
  assert.equal(f.runs.get(run.id), undefined);
});

test("stage reports are scoped to the active thread and attempt and cannot advance before native completion", async (t) => {
  let finish = () => {};
  let entered = false;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const f = loopFixture({ execute: async () => { entered = true; await pending; return { status: "completed", output: "Done", failure: null }; } });
  t.after(() => f.runner.dispose());
  const run = await f.start(); await until(() => entered);
  const live = f.runs.get(run.id); assert.ok(live?.activeToken && live.activeRoleId && live.roles[0].conversationId);
  const report = { projectId: live.projectId, runId: live.id, roleId: live.activeRoleId, conversationId: live.roles[0].conversationId,
    attemptId: live.activeToken, outcome: "complete" as const, summary: "Verified" };
  await assert.rejects(f.runner.reportStage({ ...report, attemptId: "stale" }), /no longer active/);
  await assert.rejects(f.runner.reportStage({ ...report, conversationId: "other-thread" }), /another workflow thread/);
  await assert.rejects(f.runner.reportStage({ ...report, outcome: "approve" }), /invalid outcome/);
  await f.runner.reportStage(report);
  await f.runner.reportStage(report);
  await assert.rejects(f.runner.reportStage({ ...report, summary: "Different result" }), /already reported/);
  assert.equal(f.runs.get(run.id)?.status, "running");
  assert.equal(f.runs.get(run.id)?.iterations[0].results.length, 0);
  finish(); await until(() => f.runs.get(run.id)?.status === "completed");
  await assert.rejects(f.runner.reportStage(report), /no longer active/);
});

test("text result tags cannot finish a stage without its MCP report", async (t) => {
  const f = loopFixture({ execute: async () => ({ status: "completed", output: '<nora-loop-result outcome="complete">done</nora-loop-result>', failure: null }) });
  t.after(() => f.runner.dispose()); const run = await f.start();
  await until(() => f.runs.get(run.id)?.status === "paused");
  assert.match(f.runs.get(run.id)?.stopReason ?? "", /report_workflow_stage/);
});
