import assert from "node:assert/strict";
import test from "node:test";
import type { z } from "zod";
import { normalizeCodexTool } from "@main/providers/codex/toolActivity";
import { runCodexMcpApp } from "@main/providers/codex/mcpApps";
import { CodexRpcError } from "@main/providers/codex/rpcError";
import type { JsonValue } from "@main/types/execution/rpc.types";

const identity = { id: JSON.stringify(["run", "call-1"]), runId: "run", createdAt: "2026-11-16T10:00:00.000Z" };

function rpc(answers: Record<string, JsonValue | Error>) {
  const calls: { method: string; params: JsonValue }[] = [];
  return { calls, request<T>(method: string, params: JsonValue, schema: z.ZodType<T>): Promise<T> {
    calls.push({ method, params });
    const answer = answers[method];
    if (answer instanceof Error) return Promise.reject(answer);
    if (answer === undefined) return Promise.reject(new Error(`Unexpected ${method}`));
    return Promise.resolve(schema.parse(answer));
  } };
}

test("Codex MCP calls carry their widget, current and legacy fields alike", () => {
  const item = normalizeCodexTool({ id: "call-1", type: "mcpToolCall", status: "completed", server: "lab", tool: "chart", arguments: { series: [1] },
    result: { content: [{ type: "text", text: "Charted" }], structuredContent: { ok: true } },
    mcpAppUi: { resourceUri: "ui://lab/chart", preferredModelDisplayMode: "fullscreen" } }, identity, true);
  assert.deepEqual(item?.details?.app, { server: "lab", tool: "chart", resourceUri: "ui://lab/chart", displayMode: "fullscreen",
    input: { series: [1] }, result: { content: [{ type: "text", text: "Charted" }], structuredContent: { ok: true } } });
  const legacy = normalizeCodexTool({ id: "call-1", type: "mcpToolCall", server: "lab", tool: "chart", mcpAppResourceUri: "ui://lab/chart" }, identity, false);
  assert.equal(legacy?.details?.app?.resourceUri, "ui://lab/chart");
  const plain = normalizeCodexTool({ id: "call-1", type: "mcpToolCall", server: "lab", tool: "chart", mcpAppUi: null }, identity, false);
  assert.equal(plain?.details?.app, undefined);
});

test("Codex widget reads run on the conversation's thread and scope to the originating call", async () => {
  const fake = rpc({ "mcpServer/resource/read": { contents: [{ uri: "ui://lab/chart", mimeType: "text/html;profile=mcp-app", text: "<p>Chart</p>" }] } });
  const result = await runCodexMcpApp(fake, "thread", { kind: "read-resource", server: "lab", uri: "ui://lab/chart", itemId: identity.id });
  assert.equal(result.kind, "resource");
  assert.deepEqual(fake.calls[0], { method: "mcpServer/resource/read", params: { threadId: "thread", server: "lab", uri: "ui://lab/chart", originCallId: "call-1" } });
});

test("Codex refuses widget tool calls the server keeps from widgets, and runs the rest", async () => {
  const status = { data: [{ name: "lab", tools: {
    refresh: { name: "refresh", _meta: { ui: { resourceUri: "ui://lab/chart", visibility: ["app"] } } },
    secret: { name: "secret", _meta: { ui: { visibility: ["model"] } } } } }] };
  const fake = rpc({ "mcpServerStatus/list": status, "mcpServer/tool/call": { content: [{ type: "text", text: "Refreshed" }], structuredContent: { rows: 2 } } });
  const refused = await runCodexMcpApp(fake, "thread", { kind: "call-tool", server: "lab", tool: "secret", arguments: {} });
  assert.equal(refused.kind, "unavailable");
  const unknown = await runCodexMcpApp(fake, "thread", { kind: "call-tool", server: "lab", tool: "missing", arguments: {} });
  assert.equal(unknown.kind, "unavailable");
  assert.ok(!fake.calls.some((call) => call.method === "mcpServer/tool/call"));
  const allowed = await runCodexMcpApp(fake, "thread", { kind: "call-tool", server: "lab", tool: "refresh", arguments: { range: "week" } });
  assert.deepEqual(allowed, { kind: "tool-result", result: { content: [{ type: "text", text: "Refreshed" }], structuredContent: { rows: 2 } } });
  assert.deepEqual(fake.calls.at(-1)?.params, { threadId: "thread", server: "lab", tool: "refresh", arguments: { range: "week" } });
});

test("older Codex runtimes report widgets as unavailable instead of failing", async () => {
  const fake = rpc({ "mcpServer/resource/read": new CodexRpcError(-32601, "method not found") });
  const result = await runCodexMcpApp(fake, "thread", { kind: "read-resource", server: "lab", uri: "ui://lab/chart", itemId: identity.id });
  assert.equal(result.kind, "unavailable");
  assert.match(result.kind === "unavailable" ? result.message : "", /Update Codex/);
});
