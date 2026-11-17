import { stage, definition, loopFixture, workflowResult as marker, until } from "./fixture";
import assert from "node:assert/strict";
import test from "node:test";
import { resolveLoopStages } from "@main/loops/resolveLoopStages";
import { bot } from "../../shared/bots/fixtures";

test("workflows accept more than five stages, reject empty lists and preserve order", () => {
  const stages = Array.from({ length: 12 }, (_, index) => stage(`stage-${index}`, index % 2 ? "reviewer" : "writer"));
  assert.deepEqual(definition(stages).stages, stages);
  assert.throws(() => definition([]), /at least one stage/);
});

test("ordered mixed stages hand off results and repeat with review feedback", async (t) => {
  const stages = [stage("implementation"), stage("code-review", "reviewer"), stage("qa"), stage("release-check", "reviewer"),
    stage("docs"), stage("security", "reviewer"), stage("finish")];
  const commands: string[] = [];
  const f = loopFixture({ definition: definition(stages), execute: async ({ prompt: command }) => {
    const turn = commands.length;
    commands.push(command);
    const current = stages.find((entry) => command.includes(entry.instructions));
    assert.ok(current);
    const outcome = current.kind === "reviewer" ? (turn === 1 ? "changes_requested" : "approve") : "complete";
    return { ...marker(command, outcome, `handoff-${turn}`), status: "completed", failure: null };
  } });
  t.after(() => f.runner.dispose());
  const run = await f.start();
  await until(() => f.runs.get(run.id)?.status === "completed");
  const completed = f.runs.get(run.id);
  assert.equal(commands.length, 9);
  assert.deepEqual(completed?.iterations[0].results.map((result) => result.roleId), ["implementation", "code-review"]);
  assert.ok(completed?.iterations[0].completedAt);
  assert.deepEqual(completed?.iterations[1].results.map((result) => result.roleId), stages.map((entry) => entry.id));
  assert.match(commands[2], /Perform implementation/);
  assert.match(commands[3], /Perform code-review/);
  assert.match(commands[4], /Perform qa/);
  assert.match(commands[2], /handoff-0/);
  assert.match(commands[2], /handoff-1/);
  assert.match(commands[2], /changes_requested: handoff-1/);
});

test("bot stages resolve current guidance and model once and report missing bots", () => {
  const review = { ...stage("review", "reviewer"), botId: "review-bot" };
  const savedBot = bot("review-bot", { kind: "global" }, { instructions: "Inspect regressions carefully." });
  const resolved = resolveLoopStages([review], "project", () => savedBot);
  assert.equal(resolved[0].model, savedBot.binding.model);
  assert.match(resolved[0].botSnapshot?.guidance ?? "", /Inspect regressions carefully/);
  assert.match(resolved[0].instructions, /Perform review/);
  savedBot.instructions = "Changed later";
  assert.doesNotMatch(resolved[0].botSnapshot?.guidance ?? "", /Changed later/);
  assert.throws(() => resolveLoopStages([review], "project", () => null), /unavailable/);
});

test("a reviewer cannot complete a workflow using a work-stage outcome", async (t) => {
  const f = loopFixture({ definition: definition([stage("review", "reviewer")]), execute: async ({ prompt }) => ({
    ...marker(prompt, "complete", "invalid"), status: "completed", failure: null }) });
  t.after(() => f.runner.dispose());
  const run = await f.start();
  await until(() => f.runs.get(run.id)?.status === "paused");
  assert.match(f.runs.get(run.id)?.stopReason ?? "", /invalid outcome/);
});

for (const outcome of ["continue", "changes_requested"] as const) {
  test(`${outcome} blocks downstream stages and pauses when the rework limit is reached`, async (t) => {
    const stages = [stage("implementation"), stage("review", "reviewer"), stage("qa")];
    const executed: string[] = [];
    const f = loopFixture({ definition: definition(stages), execute: async ({ prompt: command }) => {
      const current = stages.find((entry) => command.includes(entry.instructions));
      assert.ok(current);
      executed.push(current.id);
      const result = current.kind === "reviewer" ? "changes_requested" : outcome === "continue" ? "continue" : "complete";
      return { ...marker(command, result, "Fix the missing validation"), status: "completed", failure: null };
    } });
    t.after(() => f.runner.dispose());
    const run = await f.start();
    await until(() => f.runs.get(run.id)?.status === "paused");
    assert.deepEqual(executed, outcome === "continue" ? ["implementation", "implementation"]
      : ["implementation", "review", "implementation", "review"]);
    assert.match(f.runs.get(run.id)?.stopReason ?? "", /iteration limit/);
  });
}

test("a later review can return to documentation without repeating implementation and code review", async (t) => {
  const stages = [stage("implementation"), stage("code-review", "reviewer"), stage("docs"),
    { ...stage("docs-review", "reviewer"), reworkStageId: "docs" }, stage("qa")];
  const executed: string[] = [];
  const f = loopFixture({ definition: definition(stages), execute: async ({ prompt }) => {
    const current = stages.find((entry) => prompt.includes(entry.instructions)); assert.ok(current);
    executed.push(current.id);
    const outcome = current.id === "docs-review" && executed.length === 4 ? "changes_requested"
      : current.kind === "reviewer" ? "approve" : "complete";
    return { status: "completed", ...marker(prompt, outcome, "Fix the docs example"), failure: null };
  } }); t.after(() => f.runner.dispose());
  const run = await f.start(); await until(() => f.runs.get(run.id)?.status === "completed");
  assert.deepEqual(executed, ["implementation", "code-review", "docs", "docs-review", "docs", "docs-review", "qa"]);
  assert.equal(f.runs.get(run.id)?.iterations[1].results.length, 5);
});
