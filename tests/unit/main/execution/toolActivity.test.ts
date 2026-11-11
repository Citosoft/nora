import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCodexTool } from "@main/providers/codex/toolActivity";
import { formatToolContent, formatToolInput } from "@main/providers/toolPresentation";
import { normalizeCodexApproval } from "@main/providers/codex/approvals";
import { claudeApprovalDetails } from "@main/providers/claude/approvals";
import type { JsonValue } from "@main/types/execution/rpc.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import { timelineItemSchema, requestSchema } from "@shared/conversations/contracts";

const identity = { id: "activity", runId: "run", createdAt: "2026-11-10T10:00:00.000Z" };

test("Codex normalizes each tool family without forwarding provider payloads", () => {
  const cases: [JsonValue, string][] = [
    [{ id: "x", type: "commandExecution", command: "npm test", cwd: "/workspace", exitCode: 0, durationMs: 100 }, "command"],
    [{ id: "x", type: "mcpToolCall", server: "docs", tool: "search", arguments: { query: "hello" }, result: { content: [{ type: "text", text: "Found" }] } }, "integration"],
    [{ id: "x", type: "dynamicToolCall", tool: "lookup", arguments: {}, contentItems: [{ type: "inputText", text: "Result" }] }, "integration"],
    [{ id: "x", type: "functionCallOutput", name: "lookup", output: "Done" }, "integration"],
    [{ id: "x", type: "webSearch", query: "documentation" }, "search"],
    [{ id: "x", type: "webSearch", query: "", action: { type: "openPage", url: "https://example.com" } }, "search"],
    [{ id: "x", type: "imageView", path: "/image.png" }, "image"],
    [{ id: "x", type: "imageGeneration", status: "completed", savedPath: "/result.png", result: "private-base64" }, "image"],
    [{ id: "x", type: "collabAgentToolCall", tool: "spawn_agent", prompt: "Review", receiverThreadIds: ["child"] }, "agent"],
    [{ id: "x", type: "collabToolCall", tool: "wait" }, "agent"],
    [{ id: "x", type: "subAgentActivity", agentPath: "/reviewer", agentThreadId: "child", kind: { type: "started" } }, "agent"],
    [{ id: "x", type: "sleep", durationMs: 1000 }, "wait"]
  ];
  for (const [native, category] of cases) {
    const tool = normalizeCodexTool(native, identity, true);
    assert.ok(tool);
    assert.equal(tool.state, "completed");
    assert.equal(tool.details?.category, category);
    assert.doesNotThrow(() => timelineItemSchema.parse(tool));
    assert.equal(JSON.stringify(tool).includes("private-base64"), false);
  }
});

test("native failures, declines, interrupted tools and exit codes keep their final state", () => {
  for (const [status, state] of [["failed", "failed"], ["declined", "declined"], ["interrupted", "interrupted"]]) {
    assert.equal(normalizeCodexTool({ type: "commandExecution", id: "x", command: "test", status }, identity, true)?.state, state);
  }
  assert.equal(normalizeCodexTool({ type: "commandExecution", id: "x", command: "test", exitCode: 1 }, identity, true)?.state, "failed");
  assert.equal(normalizeCodexTool({ type: "mcpToolCall", id: "x", server: "s", tool: "t", error: { message: "Unavailable" } }, identity, true)?.state, "failed");
  assert.equal(normalizeCodexTool({ type: "dynamicToolCall", id: "x", tool: "t", success: false }, identity, true)?.state, "failed");
});

test("missing final command output preserves streamed output, unknown tools remain visible", () => {
  const previous = { ...identity, kind: "tool" as const, label: "Run command", output: "Streamed output", state: "running" as const };
  assert.equal(normalizeCodexTool({ type: "commandExecution", id: "x", command: "test" }, identity, true, previous)?.output, "Streamed output");
  const future = normalizeCodexTool({ type: "futureTool", id: "x", secretPayload: "secret" }, identity, true);
  assert.equal(future?.label, "futureTool");
  assert.equal(JSON.stringify(future).includes("secretPayload"), false);
  assert.equal(normalizeCodexTool({ type: "userMessage", id: "x" }, identity, true), null);
});

test("presentation redacts structured credentials, bounds arguments and describes non-text results", () => {
  const text = formatToolInput({ query: "visible", api_key: "hidden", nested: { authorization: "hidden", password: "hidden" } });
  assert.ok(text.includes("visible")); assert.ok(!text.includes("hidden"));
  assert.ok(formatToolInput("x".repeat(20_000)).length < 12_100);
  assert.equal(formatToolContent([{ type: "text", text: "Result" }, { type: "image", data: "private-base64" }, { type: "resource", resource: { text: "Document" } }]), "Result\n[image content]\nDocument");
});

test("approval normalization retains command context, exact supported choices and native decisions", () => {
  const amendment = { acceptWithExecpolicyAmendment: { execpolicy_amendment: ["npm", "test"] } };
  const result = normalizeCodexApproval("item/commandExecution/requestApproval", { itemId: "command", turnId: "turn", command: "npm test", cwd: "/workspace", reason: "Run tests", availableDecisions: ["accept", amendment, "decline", "cancel"] }, "turn", new Map(), "run");
  assert.equal(result.request.details?.command, "npm test");
  assert.equal(result.request.details?.workingDirectory, "/workspace");
  assert.equal(result.request.options.length, 4);
  assert.equal(result.request.options[1].scope, "persistent");
  assert.deepEqual(result.decisions["decision:1"], amendment);
  assert.equal(result.request.options[3].intent, "cancel");
  assert.throws(() => normalizeCodexApproval("item/commandExecution/requestApproval", { itemId: "x", turnId: "old" }, "turn", new Map(), "run"), /Stale/);
});

test("network and file approvals expose their actual target and affected paths", () => {
  const network = normalizeCodexApproval("item/commandExecution/requestApproval", { itemId: "x", turnId: "turn", networkApprovalContext: { host: "example.com", protocol: "https" }, availableDecisions: ["decline"] }, "turn", new Map(), "run");
  assert.equal(network.request.title, "Allow network access?");
  assert.equal(network.request.details?.target, "https://example.com");
  assert.deepEqual(network.request.options.map((option) => option.id), ["decline"]);
  const items = new Map<string, TimelineItem>([[JSON.stringify(["run", "patch"]), { ...identity, kind: "changes", paths: ["src/index.ts"], attribution: "turn" }]]);
  const files = normalizeCodexApproval("item/fileChange/requestApproval", { itemId: "patch", turnId: "turn", grantRoot: "/workspace" }, "turn", items, "run");
  assert.deepEqual(files.request.details?.paths, ["src/index.ts"]);
  assert.doesNotThrow(() => requestSchema.parse({ ...files.request, kind: "approval", id: "request", nativeId: "native", runId: "run", attemptId: "attempt", status: "pending", createdAt: identity.createdAt, expiresAt: identity.createdAt }));
});

test("Claude approvals show the command, reason, blocked paths and redacted tool arguments", () => {
  const command = claudeApprovalDetails("Bash", { command: "npm test" }, "/workspace", "Run tests", "/outside");
  assert.equal(command.command, "npm test"); assert.equal(command.reason, "Run tests");
  assert.deepEqual(command.paths, ["/outside"]);
  const edit = claudeApprovalDetails("Edit", { file_path: "/workspace/app.ts" }, "/workspace");
  assert.equal(edit.kind, "files"); assert.deepEqual(edit.paths, ["/workspace/app.ts"]);
  assert.ok(!claudeApprovalDetails("mcp__provider__send", { token: "secret-value", text: "Hello" }, "/workspace").input?.includes("secret-value"));
});
