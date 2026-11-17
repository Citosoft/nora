import assert from "node:assert/strict";
import test from "node:test";
import { acpControlChanges, acpControlPlan, ACP_AGENT_DEFAULT } from "@main/providers/acp/sessionControls";
import { acpDiffPatch, acpTurnOutcome, applyAcpToolUpdate } from "@main/providers/acp/normalize";
import { timelineItemSchema } from "@shared/conversations/contracts";

const identity = { id: "tool", runId: "run", createdAt: "2026-10-21T10:00:00.000Z" };

test("ACP tool updates merge partially, keep diffs as patches and never reopen a settled tool", () => {
  const started = applyAcpToolUpdate(undefined, { toolCallId: "t", title: "Edit file", kind: "edit", status: "in_progress", locations: [{ path: "src/a.ts" }] }, identity);
  assert.ok(started);
  timelineItemSchema.parse(started);
  assert.equal(started.details?.category, "file");
  assert.equal(started.details?.input, "src/a.ts");
  const done = applyAcpToolUpdate(started, { toolCallId: "t", status: "completed", content: [{ type: "diff", path: "src/a.ts", oldText: "old", newText: "new" }] }, identity);
  assert.ok(done);
  assert.equal(done.state, "completed");
  assert.equal(done.label, "Edit file");
  assert.equal(done.details?.patch, "--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1,1 +1,1 @@\n-old\n+new");
  assert.equal(applyAcpToolUpdate(done, { toolCallId: "t", status: "in_progress" }, identity), null);
});

test("ACP new-file diffs patch from /dev/null", () => {
  assert.equal(acpDiffPatch("n.txt", null, "a\nb"), "--- /dev/null\n+++ b/n.txt\n@@ -0,0 +1,2 @@\n+a\n+b");
});

test("ACP stop reasons map to finished outcomes", () => {
  assert.deepEqual(acpTurnOutcome("end_turn", "Agent"), { status: "completed", failure: null });
  assert.deepEqual(acpTurnOutcome("cancelled", "Agent"), { status: "interrupted", failure: null });
  assert.equal(acpTurnOutcome("max_tokens", "Agent").failure?.code, "provider");
  assert.equal(acpTurnOutcome("refusal", "Agent").failure?.retryable, false);
});

test("ACP controls fall back to agent defaults and reject selections the agent does not offer", () => {
  const plan = acpControlPlan({}, "Agent");
  assert.deepEqual(plan.models.map((model) => model.id), [ACP_AGENT_DEFAULT]);
  assert.deepEqual(plan.policies, [{ id: ACP_AGENT_DEFAULT, label: "Use agent settings", description: "Use the agent's configured permission mode without overriding it." }]);
  assert.deepEqual(acpControlChanges({}, { model: ACP_AGENT_DEFAULT, reasoning: null, permissionPolicy: ACP_AGENT_DEFAULT }), { ok: true, changes: [] });
  const setup = { configOptions: [{ id: "mode", name: "Mode", category: "mode", type: "select" as const, currentValue: "safe",
    options: [{ group: "g", name: "Modes", options: [{ value: "safe", name: "Safe" }, { value: "yolo", name: "Auto" }] }] }] };
  assert.deepEqual(acpControlPlan(setup, "Agent").policies, [{ id: "safe", label: "Safe" }, { id: "yolo", label: "Auto" }]);
  assert.deepEqual(acpControlChanges(setup, { model: ACP_AGENT_DEFAULT, reasoning: null, permissionPolicy: "yolo" }),
    { ok: true, changes: [{ kind: "config", configId: "mode", value: "yolo" }] });
  assert.equal(acpControlChanges(setup, { model: "other", reasoning: null, permissionPolicy: "safe" }).ok, false);
});
