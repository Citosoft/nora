import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createSimulatorHost } from "../../../simulator/main/host";
import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { ExecutionHost } from "@main/execution/host";
import type { ProviderUpdate } from "@main/types/execution/provider.types";
import { SimulatorProvider } from "../../../simulator/main/provider";
import { fixture } from "./fixture";

async function waitForSimulator(host: ExecutionHost, conversationId: string, predicate: (header: ConversationHeader | null) => boolean): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (predicate(host.header(conversationId))) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Simulator did not reach the expected state");
}

test("the suggestion scenario publishes an optional follow-up after completion without submitting it", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nora-simulator-suggestion-"));
  const { host, boot } = createSimulatorHost(directory, 0);
  try {
    await host.execute({ kind: "create", commandId: randomUUID(), conversationId: "suggestion", title: "Follow-up", parentId: null,
      workspace: boot.workspaces[0].workspace, provider: { kind: "codex", instanceId: "simulator", model: "simulated", permissionPolicy: "simulated", reasoning: null } });
    await host.execute({ kind: "submit", commandId: randomUUID(), conversationId: "suggestion", runId: "run", instruction: "/suggestions" });
    await waitForSimulator(host, "suggestion", (header) => header?.activeRuns.length === 0);
    const turns = host.conversationHistory({ conversationId: "suggestion", scope: "runs", limit: 100 });
    assert.ok(turns.scope === "runs");
    const latest = turns.runs[0];
    assert.equal(latest?.state, "completed");
    assert.equal(latest?.promptSuggestion, "Run the test suite and summarize any failures.");
    assert.equal(host.header("suggestion")?.queuedRuns.length, 0);
    const history = host.conversationHistory({ conversationId: "suggestion", scope: "timeline", limit: 100 });
    assert.equal(history.scope, "timeline");
    if (history.scope === "timeline") assert.equal(history.items.filter((item) => item.kind === "message" && item.role === "user").length, 1);
    const catalog = await host.catalog("codex", "simulator", boot.workspaces[0].workspace);
    assert.equal(catalog.status, "available");
    if (catalog.status === "available") assert.equal(catalog.catalog.capabilities.promptSuggestions, true);
  } finally { await host.shutdown(); rmSync(directory, { recursive: true, force: true }); }
});

for (const action of ["complete", "cancel", "interrupt"] as const) {
  test(`stacked approvals raise three requests together and ${action} settles the turn`, async () => {
    const directory = mkdtempSync(join(tmpdir(), "nora-simulator-stack-"));
    const { host, boot } = createSimulatorHost(directory, 0);
    try {
      await host.execute({ kind: "create", commandId: randomUUID(), conversationId: "stack", title: "Stacked approvals", parentId: null,
        workspace: boot.workspaces[0].workspace, provider: { kind: "codex", instanceId: "simulator", model: "simulated", permissionPolicy: "simulated", reasoning: null } });
      await host.execute({ kind: "submit", commandId: randomUUID(), conversationId: "stack", runId: "run", instruction: "/approval-stack" });
      await waitForSimulator(host, "stack", (header) => header?.pendingRequests.length === 3);
      const requests = host.header("stack")?.pendingRequests; assert.ok(requests);
      assert.equal(new Set(requests.map((request) => request.id)).size, 3);
      assert.deepEqual(requests.map((request) => request.kind === "approval" ? request.details?.kind : request.kind), ["command", "files", "network"]);
      if (action === "complete") {
        const choices = ["allow", "deny", "always"];
        for (const [index, request] of requests.entries()) {
          await host.execute({ kind: "respond", commandId: randomUUID(), conversationId: "stack", requestId: request.id,
            response: { kind: "approval", optionId: choices[index] } });
          await waitForSimulator(host, "stack", (header) => header?.pendingRequests.length === 2 - index);
          assert.deepEqual(host.header("stack")?.pendingRequests.map((pending) => pending.id), requests.slice(index + 1).map((pending) => pending.id));
          if (index < 2) assert.equal(host.header("stack")?.activeRuns[0]?.state, "awaiting-approval");
        }
      } else if (action === "cancel") {
        await host.execute({ kind: "respond", commandId: randomUUID(), conversationId: "stack", requestId: requests[0].id,
          response: { kind: "approval", optionId: "cancel" } });
      } else {
        await host.execute({ kind: "interrupt", commandId: randomUUID(), conversationId: "stack", runId: "run" });
      }
      await waitForSimulator(host, "stack", (header) => header?.activeRuns.length === 0);
      assert.deepEqual(host.header("stack")?.pendingRequests, []);
      assert.equal(host.summaries()[0].latestRun?.state, action === "complete" ? "completed" : "interrupted");
    } finally { await host.shutdown(); rmSync(directory, { recursive: true, force: true }); }
  });
}

test("simulator uses the real host, waits for answers and finishes with zero token usage", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nora-simulator-test-"));
  const { host, boot } = createSimulatorHost(directory, 0);
  try {
    await host.execute({ kind: "create", commandId: randomUUID(), conversationId: "conversation", title: "Simulated tour", parentId: null,
      workspace: boot.workspaces[0].workspace, provider: { kind: "codex", instanceId: "simulator", model: "simulated", permissionPolicy: "simulated", reasoning: null } });
    await host.execute({ kind: "submit", commandId: randomUUID(), conversationId: "conversation", runId: "run", instruction: "/questions" });
    await waitForSimulator(host, "conversation", (header) => header?.activeRuns[0]?.state === "awaiting-input");
    const request = host.header("conversation")?.pendingRequests[0]; assert.ok(request);
    await host.execute({ kind: "respond", commandId: randomUUID(), conversationId: "conversation", requestId: request.id,
      response: { kind: "question", answers: { pet: ["Cats"], activities: ["Walking", "Reading"], notes: ["Test"] } } });
    await waitForSimulator(host, "conversation", (header) => header?.activeRuns.length === 0);
    const summary = host.summaries()[0];
    assert.equal(summary.latestRun?.state, "completed");
    const runs = host.conversationHistory({ conversationId: "conversation", scope: "runs", limit: 100 });
    assert.equal(runs.scope, "runs");
    if (runs.scope === "runs") assert.deepEqual(runs.runs[0].usage, { inputTokens: 0, outputTokens: 0 });
    const history = host.conversationHistory({ conversationId: "conversation", scope: "timeline", limit: 100 });
    assert.equal(history.scope, "timeline");
    if (history.scope === "timeline") assert.ok(history.items.some((item) => item.kind === "message" && item.text.includes("Walking, Reading")));
    await assert.rejects(host.catalog("codex", "real-account", boot.workspaces[0].workspace), /not configured/);
  } finally { await host.shutdown(); rmSync(directory, { recursive: true, force: true }); }
});

test("simulator steers a queued instruction into the running turn without launching another turn", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nora-simulator-steer-"));
  const { host, boot } = createSimulatorHost(directory, 1);
  try {
    await host.execute({ kind: "create", commandId: randomUUID(), conversationId: "conversation", title: "Steering", parentId: null,
      workspace: boot.workspaces[0].workspace, provider: { kind: "codex", instanceId: "simulator", model: "simulated", permissionPolicy: "simulated", reasoning: null } });
    await host.execute({ kind: "submit", commandId: randomUUID(), conversationId: "conversation", runId: "active", instruction: "/slow" });
    await waitForSimulator(host, "conversation", (header) => header?.activeRuns[0]?.state === "running");
    await host.execute({ kind: "submit", commandId: randomUUID(), conversationId: "conversation", runId: "queued", instruction: "Focus on tests" });
    await host.execute({ kind: "steer-queued", commandId: randomUUID(), conversationId: "conversation", runId: "queued", targetRunId: "active" });
    await waitForSimulator(host, "conversation", (header) => header?.queuedRuns.length === 0);
    assert.equal(host.header("conversation")?.activeRuns[0].id, "active");
    const history = host.conversationHistory({ conversationId: "conversation", scope: "timeline" });
    assert.equal(history.scope, "timeline");
    if (history.scope === "timeline") assert.ok(history.items.some((item) => item.kind === "message" && item.role === "user" && item.text === "Focus on tests" && item.runId === "active"));
  } finally { await host.shutdown(); rmSync(directory, { recursive: true, force: true }); }
});

test("unfinished questions, approvals and recovery do not block other simulator scenarios", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nora-simulator-test-"));
  const { host, boot } = createSimulatorHost(directory, 0);
  try {
    assert.equal(boot.workspaces[0].workspace.access, "read");
    for (const scenario of ["questions", "approvals", "approval-stack", "recovery", "tools"]) {
      await host.execute({ kind: "create", commandId: randomUUID(), conversationId: scenario, title: scenario, parentId: null,
        workspace: boot.workspaces[0].workspace, provider: { kind: "codex", instanceId: "simulator", model: "simulated", permissionPolicy: "simulated", reasoning: null } });
      await host.execute({ kind: "submit", commandId: randomUUID(), conversationId: scenario, runId: scenario, instruction: `/${scenario}` });
      await waitForSimulator(host, scenario, (header) => scenario === "tools" ? header?.activeRuns.length === 0
        : header?.activeRuns[0]?.state === (scenario === "questions" ? "awaiting-input" : scenario === "recovery" ? "recovering" : "awaiting-approval"));
    }
    assert.equal(host.header("questions")?.pendingRequests[0]?.kind, "question");
    assert.equal(host.header("approvals")?.pendingRequests[0]?.kind, "approval");
    assert.equal(host.header("approval-stack")?.pendingRequests.length, 3);
    assert.equal(host.header("recovery")?.activeRuns[0]?.state, "recovering");
    assert.equal(host.summaries().find((entry) => entry.conversation.id === "tools")?.latestRun?.state, "completed");
  } finally { await host.shutdown(); rmSync(directory, { recursive: true, force: true }); }
});

test("default simulator pacing waits for the first response and interruption cancels that wait", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const snapshot = f.store.execution("conversation", "run"); assert.ok(snapshot);
  const execution = { snapshot, run: snapshot.runs[0] };
  const provider = new SimulatorProvider();
  const updates: ProviderUpdate[] = [];
  const task = provider.start(execution, (update) => updates.push(update));
  assert.deepEqual(updates.map((update) => update.kind), ["started"]);
  await provider.interrupt(execution); await task;
  assert.deepEqual(updates.map((update) => update.kind), ["started", "finished"]);
});

test("completed-only simulated tools first emit running activity and streaming uses small chunks", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const snapshot = f.store.execution("conversation", "run"); assert.ok(snapshot);
  const provider = new SimulatorProvider(0);
  const updates: ProviderUpdate[] = [];
  await provider.start({ snapshot, run: { ...snapshot.runs[0], instruction: "/long-output" } }, (update) => updates.push(update));
  const items = updates.flatMap((update) => update.kind === "item" ? [update.item] : []);
  const tools = items.filter((item) => item.kind === "tool");
  assert.deepEqual(tools.map((item) => item.state), ["running", "completed"]);
  assert.equal(tools[0].output, "");
  assert.match(tools[1].output, /Line 500:/);
  const messages = items.filter((item) => item.kind === "message");
  assert.equal(messages[0].text.length, 6);
  assert.equal(messages.at(-1)?.complete, true);
});

test("usage exhaustion simulates a real provider failure without a successful reply", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nora-simulator-usage-"));
  const { host, boot } = createSimulatorHost(directory, 0);
  try {
    await host.execute({ kind: "create", commandId: randomUUID(), conversationId: "usage", title: "Usage limit", parentId: null,
      workspace: boot.workspaces[0].workspace, provider: { kind: "codex", instanceId: "simulator", model: "simulated", permissionPolicy: "simulated", reasoning: null } });
    await host.execute({ kind: "submit", commandId: randomUUID(), conversationId: "usage", runId: "exhausted", instruction: "/usage-limit" });
    await waitForSimulator(host, "usage", () => host.summaries()[0]?.latestRun?.state === "failed");
    const failure = host.summaries()[0].latestRun?.failure;
    assert.equal(failure?.code, "usage-limit");
    assert.equal(failure?.message, "Codex usage limit reached");
    assert.equal(failure?.retryable, true);
    assert.ok(failure?.resetsAt);
    assert.ok(Date.parse(failure.resetsAt) > Date.now());
    const timeline = host.conversationHistory({ conversationId: "usage", scope: "timeline", limit: 100 });
    assert.equal(timeline.scope, "timeline");
    if (timeline.scope === "timeline") assert.equal(timeline.items.some((item) => item.kind === "message" && item.role === "assistant"), false);
    const history = host.conversationHistory({ conversationId: "usage", scope: "runs", limit: 100 });
    assert.equal(history.scope, "runs");
    if (history.scope === "runs") {
      assert.equal(history.runs[0].failure?.code, "usage-limit");
      assert.deepEqual(history.runs[0].usage, { inputTokens: 0, outputTokens: 0 });
    }
  } finally { await host.shutdown(); rmSync(directory, { recursive: true, force: true }); }
});
