import assert from "node:assert/strict";
import test from "node:test";
import type { McpServerStatus } from "@anthropic-ai/claude-agent-sdk";
import { callsClaudeMcpTool, claudeMcpAppLookup, claudeMcpAppResult } from "@main/providers/claude/mcpApps";
import { ClaudeToolActivity } from "@main/providers/claude/toolActivity";
import { claudeAssistantMessage, claudeUserMessage } from "./toolFixtures";

function server(name: string, tools: McpServerStatus["tools"]): McpServerStatus {
  return { name, status: "connected", tools };
}

test("Claude widget lookup resolves tool names against the real server list", () => {
  const lookup = claudeMcpAppLookup([
    server("data__lab", [{ name: "chart", _meta: { ui: { resourceUri: "ui://lab/chart" } } }, { name: "plain" }]),
    server("my server", [{ name: "show.view", _meta: { "ui/resourceUri": "ui://view" } }])
  ]);
  assert.deepEqual(lookup("mcp__data__lab__chart"), { server: "data__lab", tool: "chart", ui: { resourceUri: "ui://lab/chart", visibility: null } });
  assert.equal(lookup("mcp__data__lab__plain"), null);
  assert.equal(lookup("mcp__my_server__show_view")?.server, "my server");
  assert.equal(lookup("Bash"), null);
});

test("only messages that call an MCP tool wait for widget metadata", () => {
  assert.equal(callsClaudeMcpTool(claudeAssistantMessage([{ type: "tool_use", id: "a", name: "mcp__lab__chart", input: {} }])), true);
  assert.equal(callsClaudeMcpTool(claudeAssistantMessage([{ type: "tool_use", id: "b", name: "Read", input: {} }])), false);
});

test("widget results prefer the server's raw result, then the content the model saw", () => {
  assert.deepEqual(claudeMcpAppResult({ content: [{ type: "text", text: "Raw" }], structuredContent: { rows: 3 } }, "Flattened"),
    { content: [{ type: "text", text: "Raw" }], structuredContent: { rows: 3 } });
  assert.deepEqual(claudeMcpAppResult([{ type: "text", text: "Blocks" }], "Flattened"), { content: [{ type: "text", text: "Blocks" }] });
  assert.deepEqual(claudeMcpAppResult("unknown", [{ type: "text", text: "Model" }]), { content: [{ type: "text", text: "Model" }] });
  assert.deepEqual(claudeMcpAppResult(undefined, "Text"), { content: [{ type: "text", text: "Text" }] });
});

test("Claude tool activity attaches the widget to the call and its result once known", () => {
  const tools = new ClaudeToolActivity();
  tools.useMcpApps(claudeMcpAppLookup([server("lab", [{ name: "chart", _meta: { ui: { resourceUri: "ui://lab/chart" } } }])]));
  const [running] = tools.accept(claudeAssistantMessage([{ type: "tool_use", id: "call", name: "mcp__lab__chart", input: { series: [1] } }]));
  assert.deepEqual(running.details?.app, { server: "lab", tool: "chart", resourceUri: "ui://lab/chart", displayMode: "inline", input: { series: [1] } });
  const result = claudeUserMessage([{ type: "tool_result", tool_use_id: "call", content: [{ type: "text", text: "Charted" }] }]);
  const [completed] = tools.accept({ ...result, tool_use_result: { content: [{ type: "text", text: "Charted" }], structuredContent: { ok: true } } });
  assert.equal(completed.state, "completed");
  assert.deepEqual(completed.details?.app?.result, { content: [{ type: "text", text: "Charted" }], structuredContent: { ok: true } });
  assert.deepEqual(completed.details?.app?.input, { series: [1] });
  const [other] = tools.accept(claudeAssistantMessage([{ type: "tool_use", id: "read", name: "mcp__lab__other", input: {} }]));
  assert.equal(other.details?.app, undefined);
});
