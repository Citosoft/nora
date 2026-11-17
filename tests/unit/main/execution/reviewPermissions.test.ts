import assert from "node:assert/strict";
import test from "node:test";
import { claudeReadOnlyOptions, isClaudeInspectionTool } from "@main/providers/claude/readOnly";

test("Claude read-only threads cannot expose file edits, execution, delegation or external tools", () => {
  assert.deepEqual(claudeReadOnlyOptions(), { tools: ["Read", "Glob", "Grep", "AskUserQuestion"], mcpServers: {}, strictMcpConfig: true });
  for (const name of ["Bash", "PowerShell", "Write", "Edit", "Agent", "mcp__connector__write"]) assert.equal(isClaudeInspectionTool(name), false);
  for (const name of ["Read", "Glob", "Grep", "AskUserQuestion", "mcp__nora__report_workflow_stage"]) assert.equal(isClaudeInspectionTool(name), true);
});

test("read-only workflow reporting exposes only Nora's report tool and no connector servers", async () => {
  const { workflowReviewMcpServers } = await import("@main/nora-tools/endpoint");
  const servers = workflowReviewMcpServers({ tools: { url: "http://127.0.0.1:1/mcp", token: "stage" } });
  const options = claudeReadOnlyOptions(servers);
  assert.deepEqual(options.allowedTools, ["mcp__nora__report_workflow_stage"]);
  assert.deepEqual(Object.keys(options.mcpServers ?? {}), ["nora"]);
  assert.equal(options.strictMcpConfig, true);
});
