import { createQuickAgentPayload, resolveDefaultAgentTool } from "@/components/app/logic/agentQuickLaunch";
import assert from "node:assert/strict";
import test from "node:test";

const catalog = [
  { id: "missing", detected: false, enabled: true },
  { id: "disabled", detected: true, enabled: false },
  { id: "codex", detected: true, enabled: true },
  { id: "claude", detected: true, enabled: true }
];

test("resolveDefaultAgentTool prefers the preferred tool when it is usable", () => {
  assert.equal(resolveDefaultAgentTool(catalog, "claude")?.id, "claude");
});

test("resolveDefaultAgentTool falls back to the first usable tool", () => {
  assert.equal(resolveDefaultAgentTool(catalog, null)?.id, "codex");
  assert.equal(resolveDefaultAgentTool(catalog, "disabled")?.id, "codex");
  assert.equal(resolveDefaultAgentTool(catalog, "missing")?.id, "codex");
});

test("resolveDefaultAgentTool returns null when no tool is usable", () => {
  assert.equal(resolveDefaultAgentTool(catalog.slice(0, 2), "missing"), null);
});

test("createQuickAgentPayload launches a blank agent in the project root checkout", () => {
  const payload = createQuickAgentPayload("claude");
  assert.equal(payload.toolId, "claude");
  assert.equal(payload.task, "");
  assert.equal(payload.mode, "write");
  assert.deepEqual(payload.target, { kind: "root" });
  assert.equal(payload.prepareWorktree, false);
});
