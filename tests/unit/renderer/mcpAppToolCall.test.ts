import assert from "node:assert/strict";
import test from "node:test";
import { isMcpAppLink, mcpAppMessageText, mcpAppToolArguments, mcpAppToolCall, mcpAppToolCancelled, mcpAppToolResult } from "@/components/app/logic/mcp-app/toolCall";
import { mcpAppHostCapabilities, readMcpAppTheme } from "@/components/app/logic/mcp-app/hostContext";
import type { ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";

const app = { server: "lab", tool: "chart", resourceUri: "ui://lab/chart", displayMode: "inline" as const };
function call(state: ToolState, output = "Charted", result?: { content: [] }) {
  const tool: ToolActivity = { id: "chart", runId: "run", createdAt: "2026-11-16T10:00:00.000Z", kind: "tool", label: "chart", output, state,
    details: { category: "integration", app: { ...app, ...(result ? { result } : {}) } } };
  const shaped = mcpAppToolCall(tool);
  assert.ok(shaped);
  return shaped;
}

test("widget results wait for the call, prefer the raw result, and fall back to its text", () => {
  assert.equal(mcpAppToolResult(call("running")), null);
  assert.deepEqual(mcpAppToolResult(call("completed", "Charted", { content: [] })), { content: [] });
  assert.deepEqual(mcpAppToolResult(call("completed")), { content: [{ type: "text", text: "Charted" }] });
  assert.deepEqual(mcpAppToolResult(call("failed", "Broken")), { content: [{ type: "text", text: "Broken" }], isError: true });
  assert.equal(mcpAppToolCancelled(call("interrupted")), true);
  assert.equal(mcpAppToolCancelled(call("completed")), false);
  assert.equal(mcpAppToolCall({ ...call("completed").tool, details: { category: "integration" } }), null);
});

test("widget requests are narrowed before they reach the thread", () => {
  assert.equal(mcpAppMessageText([{ type: "text", text: "Show March" }, { type: "image", data: "x" }, { type: "text", text: "Thanks" }]), "Show March\n\nThanks");
  assert.equal(mcpAppMessageText([{ type: "image" }]), "");
  assert.deepEqual(mcpAppToolArguments(undefined), {});
  assert.deepEqual(mcpAppToolArguments({ range: "week" }), { range: "week" });
  assert.equal(mcpAppToolArguments(["not", "an", "object"]), null);
  assert.equal(isMcpAppLink("https://example.com"), true);
  assert.equal(isMcpAppLink("javascript:alert(1)"), false);
  assert.equal(isMcpAppLink("file:///etc/passwd"), false);
});

test("the widget theme follows the app's tokens and offers tool calls only where supported", () => {
  const tokens: Record<string, string> = { "--background": " 0 0% 100% ", "--foreground": "0 0% 10%", "--app-ui-font": "Inter", "--radius": "8px" };
  const theme = readMcpAppTheme("dark", (name) => tokens[name] ?? "");
  assert.equal(theme.theme, "dark");
  assert.equal(theme.variables["--color-background-primary"], "hsl(0 0% 100%)");
  assert.equal(theme.variables["--color-text-primary"], "hsl(0 0% 10%)");
  assert.equal(theme.variables["--font-sans"], "Inter");
  assert.equal(theme.variables["--color-border-primary"], undefined);
  assert.equal(readMcpAppTheme(undefined, () => "").theme, "light");
  assert.ok(mcpAppHostCapabilities(true).serverTools);
  assert.equal(mcpAppHostCapabilities(false).serverTools, undefined);
});
