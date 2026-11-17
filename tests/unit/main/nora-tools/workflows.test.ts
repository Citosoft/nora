import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createNoraToolServer } from "@main/nora-tools/server";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import { noraFixture } from "./fixture";

const contextOf = (f: ReturnType<typeof noraFixture>, id = "plain") => { const context = f.deps.context(id); assert.ok(context); return context; };
const role = (name: string, extra: { agent?: string; model?: string | null; kind?: "writer" | "reviewer"; botId?: string } = {}) => ({ name, kind: "writer" as const, instructions: `Act as ${name}.`, ...extra });

test("create_workflow defaults agents to the thread's provider and limits to the designer's defaults", async () => {
  const f = noraFixture();
  const created = await f.deps.workflows.create({ name: "Ship it", stages: [role("Implementer"), role("Reviewer", { kind: "reviewer", agent: "codex", model: "gpt-6" })] }, contextOf(f));
  assert.equal(created.projectId, "shell-w");
  assert.match(created.id, /^loop-/);
  assert.deepEqual([created.stages[0].kind, created.stages[0].toolId, created.stages[0].model], ["writer", "claude", null]);
  assert.deepEqual(created.stages.slice(1).map((entry) => [entry.kind, entry.toolId, entry.model]), [["reviewer", "codex", "gpt-6"]]);
  assert.deepEqual(created.limits, { maxIterations: 10, maxDurationMs: 240 * 60_000, roleTimeoutMs: 30 * 60_000 });
  const listed = await f.deps.workflows.list(contextOf(f));
  assert.deepEqual(listed.map((entry) => [entry.definition.id, entry.latestRun]), [[created.id, null]]);
});

test("create_workflow rejects uninstalled providers and invalid limits", async () => {
  const f = noraFixture();
  const context = contextOf(f);
  await assert.rejects(f.deps.workflows.create({ name: "Bad", stages: [role("W", { agent: "kiro" })] }, context), /No installed workflow provider/);
  await assert.rejects(f.deps.workflows.create({ name: "Bad", stages: [role("W", { agent: "goose", model: "x" })] }, context), /No installed workflow provider/);
  await assert.rejects(f.deps.workflows.create({ name: "Bad", stages: [role("W")], limits: { maxIterations: 0 } }, context), /iterations must be between 1 and 100/);
  await assert.rejects(f.deps.workflows.list(contextOf(f, "elsewhere")), /has no workflows/);
  assert.equal(f.workflows.saved.length, 0);
});

test("update_workflow replaces ordered stages and merges limits without changing existing runs", async () => {
  const f = noraFixture();
  const context = contextOf(f);
  const created = await f.deps.workflows.create({ name: "Ship it", stages: [role("Implementer"), role("A", { kind: "reviewer" })] }, context);
  const renamed = await f.deps.workflows.update({ id: created.id, name: "Delivery", limits: { maxIterations: 3 } }, context);
  assert.deepEqual(renamed.stages, created.stages);
  assert.deepEqual(renamed.limits, { ...created.limits, maxIterations: 3 });
  assert.equal(renamed.createdAt, created.createdAt);
  const switched = await f.deps.workflows.update({ id: created.id, stages: [role("QA", { agent: "codex" })] }, context);
  assert.deepEqual(switched.stages.map((stage) => [stage.name, stage.toolId, stage.model]), [["QA", "codex", null]]);
  await assert.rejects(f.deps.workflows.update({ id: created.id, stages: [] }, context), /at least one stage/);
  await assert.rejects(f.deps.workflows.update({ id: "missing", name: "x" }, context), /No workflow with id "missing"/);
});

test("run_workflow starts in a new worktree named after the goal, uses tasks by id, and reports preparation failures", async () => {
  const f = noraFixture();
  const context = contextOf(f);
  const { id } = await f.deps.workflows.create({ name: "Ship it", stages: [role("Implementer")] }, context);
  await assert.rejects(f.deps.workflows.run({ id }, context), /objective, a task_id, or both/);
  const run = await f.deps.workflows.run({ id, taskId: "a", objective: "Keep it small" }, context);
  assert.equal(run.status, "running");
  assert.deepEqual(f.workflows.started.at(-1), { projectId: "shell-w", definitionId: id, objective: "Keep it small", taskPath: ".nora/tasks/a.md",
    target: { kind: "new" }, worktreeBranch: { prefix: "loop", name: "First" } });
  f.workflows.state.placement = "project-folder";
  await f.deps.workflows.run({ id, objective: "Tidy up" }, context);
  assert.deepEqual([f.workflows.started.at(-1)?.target, f.workflows.started.at(-1)?.worktreeBranch], [{ kind: "root" }, null]);
  f.workflows.state.placement = "unavailable";
  await assert.rejects(f.deps.workflows.run({ id, objective: "x" }, context), /Open Web there/);
  f.workflows.state.placement = "worktree";
  f.workflows.state.failPreparation = "Choose a project before starting a workflow run.";
  await assert.rejects(f.deps.workflows.run({ id, objective: "x" }, context), /could not start: Choose a project.*run id run3/);
  assert.equal((await f.deps.workflows.list(context))[0]?.latestRun?.id, "run3");
});

test("workflow run tools read and control runs only in this workspace", async () => {
  const f = noraFixture();
  const context = contextOf(f);
  const { id } = await f.deps.workflows.create({ name: "Ship it", stages: [role("Implementer")] }, context);
  const run = await f.deps.workflows.run({ id, objective: "Go" }, context);
  assert.equal((await f.deps.workflows.readRun(run.id, context)).objective, "Go");
  assert.equal((await f.deps.workflows.controlRun(run.id, "pause", context)).status, "paused");
  assert.equal((await f.deps.workflows.controlRun(run.id, "resume", context)).status, "running");
  assert.equal((await f.deps.workflows.controlRun(run.id, "cancel", context)).status, "cancelled");
  await assert.rejects(f.deps.workflows.readRun("nope", context), /No workflow run with id "nope"/);
});

test("workflow tools are Nora-only over MCP and map snake_case input to the runner", async (t) => {
  const f = noraFixture();
  const server = createNoraToolServer(f.deps);
  t.after(() => server.close());
  const connect = async (id: string): Promise<Client> => {
    const endpoint = await server.resolve(f.conversations.get(id) as Conversation);
    assert.ok(endpoint);
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(endpoint.url), { requestInit: { headers: { Authorization: `Bearer ${endpoint.token}` } } }));
    t.after(() => client.close());
    return client;
  };
  const botClient = await connect("bot");
  assert.equal((await botClient.listTools()).tools.some((tool) => tool.name.includes("workflow")), false);
  const client = await connect("plain");
  const created = await client.callTool({ name: "create_workflow", arguments: { name: "Ship it", stages: [role("Implementer")], limits: { max_iterations: 4, role_timeout_minutes: 15 } } });
  assert.notEqual(created.isError, true);
  assert.match(JSON.stringify(created.content), /4 iterations, 240 min total, 15 min per turn/);
  const id = f.workflows.definitions[0]?.id;
  assert.ok(id);
  const started = await client.callTool({ name: "run_workflow", arguments: { id, objective: "Ship the release", task_id: "b" } });
  assert.match(JSON.stringify(started.content), /run id run1/);
  assert.equal(f.workflows.started[0]?.taskPath, ".nora/tasks/b.md");
  const read = await client.callTool({ name: "read_workflow_run", arguments: { id: "run1" } });
  assert.match(JSON.stringify(read.content), /running/);
  assert.match(JSON.stringify(read.content), /task \.nora\/tasks\/b\.md; Ship the release/);
  const invalid = await client.callTool({ name: "control_workflow_run", arguments: { id: "run1", action: "stop" } });
  assert.equal(invalid.isError, true);
  const listed = await client.callTool({ name: "list_workflows", arguments: {} });
  assert.match(JSON.stringify(listed.content), /latest run: run1, running/);
});

test("workflow tools allow unlimited stages and assign saved workspace bots", async () => {
  const f = noraFixture();
  const stages = Array.from({ length: 8 }, (_, index) => role(`Stage ${index + 1}`, { kind: index % 2 ? "reviewer" : "writer", botId: "ada" }));
  const created = await f.deps.workflows.create({ name: "Bot delivery", stages }, contextOf(f));
  assert.equal(created.stages.length, 8);
  assert.equal(created.stages[1].botId, "ada");
  assert.equal(created.stages[1].toolId, "claude");
  assert.equal(created.stages[1].model, "claude-opus-5-5");
  await assert.rejects(f.deps.workflows.create({ name: "Missing bot", stages: [role("Review", { botId: "missing" })] }, contextOf(f)), /No bot/);
});

test("workflow tools preserve explicit stage ids and configurable rework destinations", async () => {
  const f = noraFixture();
  const created = await f.deps.workflows.create({ name: "Delivery", stages: [
    { ...role("Implement"), id: "implement" },
    { ...role("Review", { kind: "reviewer" }), id: "review", reworkStageId: "implement" }
  ] }, contextOf(f));
  assert.equal(created.stages[1].reworkStageId, "implement");
  assert.equal(created.stages[0].instanceId, "claude");
});

test("read-only workflow threads expose only the scoped stage-report MCP tool", async (t) => {
  const f = noraFixture();
  const base = f.conversations.get("bot"); assert.ok(base);
  const workflow = { ...base, id: "workflow-review", workspace: { ...base.workspace, access: "read" as const },
    source: { kind: "workflow" as const, projectId: "shell-w", runId: "workflow-run", stageId: "review" } };
  f.conversations.set(workflow.id, workflow);
  const server = createNoraToolServer(f.deps); t.after(() => server.close());
  const endpoint = await server.resolve(workflow); assert.ok(endpoint);
  const client = new Client({ name: "workflow-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint.url), { requestInit: { headers: { Authorization: `Bearer ${endpoint.token}` } } }));
  t.after(() => client.close());
  assert.deepEqual((await client.listTools()).tools.map((tool) => tool.name), ["report_workflow_stage"]);
  const reply = await client.callTool({ name: "report_workflow_stage", arguments: { attempt_id: "attempt", outcome: "approve", summary: "Verified" } });
  assert.notEqual(reply.isError, true);
  assert.deepEqual(f.workflows.reported, [{ attemptId: "attempt", outcome: "approve", summary: "Verified", projectId: "shell-w",
    runId: "workflow-run", roleId: "review", conversationId: "workflow-review" }]);
  await assert.rejects(f.deps.workflows.report({ attemptId: "attempt", outcome: "complete", summary: "x" }, contextOf(f)), /Only a workflow stage thread/);
});
