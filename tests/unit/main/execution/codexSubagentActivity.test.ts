import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCodexSubagents } from "@main/providers/codex/subagentActivity";
import type { CodexSubagentContext } from "@main/types/execution/codex.types";
import type { SubagentActivity } from "@shared/types/conversation/contracts.types";
import { timelineItemSchema } from "@shared/conversations/contracts";

function context(known: SubagentActivity[] = [], runId = "run"): CodexSubagentContext {
  return { runId, now: "2026-01-01T00:00:00.000Z", complete: true, find: (id) => known.filter((item) => item.nativeId === id).at(-1) };
}

test("a Codex spawn reports one subagent per child thread instead of a tool", () => {
  const update = normalizeCodexSubagents({ id: "call", type: "collabAgentToolCall", tool: "spawnAgent", status: "completed", prompt: "Review the diff\nFocus on retries",
    receiverThreadIds: ["child-a", "child-b"], agentsStates: { "child-a": { status: "running", message: null } }, model: "gpt-mini", reasoningEffort: "low" }, context());
  assert.ok(update);
  assert.equal(update.replacesTool, true);
  assert.deepEqual(update.items.map((item) => [item.nativeId, item.label, item.state]), [["child-a", "Review the diff", "running"], ["child-b", "Review the diff", "running"]]);
  assert.deepEqual(update.items.map((item) => [item.model, item.effort]), [["gpt-mini", "low"], ["gpt-mini", "low"]]);
  for (const item of update.items) assert.doesNotThrow(() => timelineItemSchema.parse(item));
});

test("activity records name the agent and later waits report its outcome in the current turn", () => {
  const [spawned] = normalizeCodexSubagents({ id: "call", type: "collabAgentToolCall", tool: "spawnAgent", status: "completed", prompt: "Review", receiverThreadIds: ["child"] }, context())?.items ?? [];
  const [named] = normalizeCodexSubagents({ id: "activity", type: "subAgentActivity", agentPath: "/reviewer", agentThreadId: "child", kind: "started", model: "gpt-resolved", reasoningEffort: null }, context([spawned]))?.items ?? [];
  assert.equal(named.model, "gpt-resolved", "activity records carry the resolved model");
  assert.equal(named.label, "reviewer"); assert.equal(named.prompt, "Review"); assert.equal(named.id, spawned.id);
  const wait = normalizeCodexSubagents({ id: "wait", type: "collabAgentToolCall", tool: "wait", status: "completed", receiverThreadIds: ["child"],
    agentsStates: { child: { status: "completed", message: "No issues found." }, unknown: { status: "completed", message: null } } }, context([named], "next-run"));
  assert.ok(wait);
  assert.equal(wait.replacesTool, false, "the wait call still appears as a tool");
  assert.equal(wait.items.length, 1, "agents never spawned in this thread are ignored");
  assert.equal(wait.items[0].state, "completed"); assert.equal(wait.items[0].result, "No issues found."); assert.equal(wait.items[0].runId, "next-run");
});

test("legacy object kinds and unrelated items are handled", () => {
  const legacy = normalizeCodexSubagents({ id: "activity", type: "subAgentActivity", agentPath: "/reviewer", agentThreadId: "child", kind: { type: "completed" } }, context());
  assert.equal(legacy?.items[0].state, "completed");
  assert.equal(normalizeCodexSubagents({ id: "x", type: "commandExecution", command: "npm test" }, context()), null);
});
