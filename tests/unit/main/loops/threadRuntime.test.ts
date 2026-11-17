import assert from "node:assert/strict";
import test from "node:test";
import { createLoopThreadRuntime } from "@main/loops/threadRuntime";
import { noraToolsStatus } from "@shared/nora-tools/catalog";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import { fakeHost } from "../bots/fakeHost";
import { bot } from "../../shared/bots/fixtures";
import { loopFixture, definition, stage, until, workflowResult } from "./fixture";

const catalog: ProviderCatalogResult = { status: "available", catalog: {
  kind: "claude", instanceId: "claude-custom", authentication: "present",
  capabilities: { resume: true, interrupt: true, steering: false, approvals: true, questions: true, reasoning: true, attachments: false, turnChanges: true, subagentDetails: false },
  models: [{ id: "custom-model", name: "Custom", description: "", reasoningEfforts: ["high"], defaultReasoningEffort: "high" }], policies: [{ id: "safe", label: "Safe" }]
} };

test("workflow bots use native threads with their frozen identity, provider instance, model, reasoning and permissions", async (t) => {
  const reviewer = bot("review-bot", { kind: "global" }, { binding: { kind: "claude", instanceId: "claude-custom", model: "custom-model", reasoning: "high", permissionPolicy: "safe" } });
  let report = async (_prompt: string): Promise<string> => "";
  const fake = fakeHost([], (_bot, prompt) => report(prompt));
  fake.host.catalog = async () => catalog;
  const boot: NativeBoot = { environmentId: "local", cursor: 0, sharedBots: [], noraTools: noraToolsStatus("idle"),
    providers: [{ kind: "claude", instanceId: "claude-custom", label: "Custom Claude", reportsMcp: true }],
    personalization: { defaultRole: null, workspaceRoles: {}, bots: { global: [reviewer], workspaces: {} } },
    workspaces: [{ id: "native-project", shellProjectId: "project", name: "Project", kind: "repository", workspace: {
      projectId: "native-project", environmentId: "local", checkoutId: "tree", path: "/tmp/workflow", branch: "main", access: "write"
    } }] };
  let id = 0;
  const runtime = createLoopThreadRuntime({ host: () => fake.host, boot: () => boot, registerCheckouts: async () => false, nextId: () => `native-${++id}` });
  const f = loopFixture({ definition: definition([{ ...stage("review", "reviewer"), botId: reviewer.id }]), resolveBot: () => reviewer,
    prepare: runtime.prepare, execute: runtime.execute }); t.after(() => f.runner.dispose());
  report = async (prompt) => {
    const result = workflowResult(prompt, "approve");
    const active = [...f.runs.values()].find((entry) => entry.activeRoleId === "review"); assert.ok(active);
    const role = active.roles.find((entry) => entry.roleId === "review"); assert.ok(role?.conversationId);
    await f.runner.reportStage({ ...result.report, runId: active.id, projectId: active.projectId, roleId: role.roleId, conversationId: role.conversationId });
    return result.output;
  };
  const run = await f.start(); await until(() => f.runs.get(run.id)?.status === "completed");
  const role = f.runs.get(run.id)?.roles[0]; assert.ok(role?.conversationId);
  const thread = fake.conversations.get(role.conversationId); assert.ok(thread);
  assert.equal(thread.workspace.access, "read");
  assert.equal(thread.workspace.projectId, "native-project");
  assert.deepEqual(thread.provider, reviewer.binding);
  assert.equal(thread.bot?.botId, reviewer.id);
  assert.match(thread.bot?.guidance ?? "", /Be concise/);
  reviewer.instructions = "Changed after launch";
  assert.doesNotMatch(thread.bot?.guidance ?? "", /Changed after launch/);
  const count = fake.commands.filter((command) => command.kind === "create").length;
  await runtime.prepare(f.runs.get(run.id)!, new AbortController().signal);
  assert.equal(fake.commands.filter((command) => command.kind === "create").length, count);
});

test("ordinary workflow stages also execute in native threads and interrupt them on timeout", async (t) => {
  const fake = fakeHost([], () => null); fake.host.catalog = async () => catalog;
  const boot: NativeBoot = { environmentId: "local", cursor: 0, sharedBots: [], noraTools: noraToolsStatus("idle"),
    providers: [{ kind: "claude", instanceId: "claude-custom", label: "Claude", reportsMcp: true }],
    personalization: { defaultRole: null, workspaceRoles: {}, bots: { global: [], workspaces: {} } },
    workspaces: [{ id: "native-project", shellProjectId: "project", name: "Project", kind: "folder", workspace: {
      projectId: "native-project", environmentId: "local", checkoutId: "tree", path: "/tmp/workflow", branch: "", access: "write"
    } }] };
  let id = 0;
  const runtime = createLoopThreadRuntime({ host: () => fake.host, boot: () => boot, registerCheckouts: async () => false, nextId: () => `native-${++id}` });
  const f = loopFixture(); t.after(() => f.runner.dispose()); const run = await f.start();
  await until(() => f.runs.get(run.id)?.status === "completed");
  const roles = await runtime.prepare({ ...run, roles: run.roles }, new AbortController().signal);
  assert.ok(roles[0].conversationId);
  const result = await runtime.execute({ conversationId: roles[0].conversationId, prompt: "Do work", timeoutMs: 10,
    signal: new AbortController().signal, onOutput: () => {} });
  assert.equal(result.status, "timed-out");
  assert.ok(fake.commands.some((command) => command.kind === "interrupt"));
  assert.equal(fake.conversations.get(roles[0].conversationId)?.workspace.access, "write");
});
