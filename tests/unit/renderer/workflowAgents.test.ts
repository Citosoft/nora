import { bot } from "../shared/bots/fixtures";
import { buildWorkflowAgentSummaries } from "@/components/app/logic/workflowAgents";
import type { AgentCatalogEntry, LoopRoleDefinition } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const role = (overrides: Partial<LoopRoleDefinition>): LoopRoleDefinition => ({
  id: "role", kind: "writer", name: "Implementer", toolId: "claude", model: null, instructions: "Do it", ...overrides
});

test("labels workflow agents from the catalog and falls back to the tool id and a role name", () => {
  const catalog = [{ id: "claude", label: "Claude Code" }] as AgentCatalogEntry[];
  assert.deepEqual(buildWorkflowAgentSummaries([
    role({ id: "w" }),
    role({ id: "r", kind: "reviewer", name: "  ", toolId: "unknown-tool" })
  ], catalog), [
    { id: "w", name: "Implementer", toolId: "claude", toolLabel: "Claude Code", model: null, kind: "writer" },
    { id: "r", name: "Reviewer", toolId: "unknown-tool", toolLabel: "unknown-tool", model: null, kind: "reviewer" }
  ]);
});

test("workflow bot assignments preserve the configured avatar and readable name", () => {
  const reviewer = bot("review-bot");
  const [summary] = buildWorkflowAgentSummaries([role({ botId: reviewer.id })], [], [reviewer]);
  assert.equal(summary.botId, reviewer.id);
  assert.deepEqual(summary.avatar, reviewer.avatar);
  assert.equal(summary.toolLabel, "Review Bot · claude");
  const [missing] = buildWorkflowAgentSummaries([role({ botId: "deleted-bot" })], []);
  assert.equal(missing.botId, "deleted-bot");
  assert.equal(missing.avatar, undefined);
});
