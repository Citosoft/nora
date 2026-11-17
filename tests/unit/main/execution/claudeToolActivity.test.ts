import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { ClaudeToolActivity } from "@main/providers/claude/toolActivity";
import type { SDKAssistantMessage, SDKToolProgressMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

import { claudeAssistantMessage, claudeUserMessage } from "./toolFixtures";

test("nested Claude tools retain names, inputs, parent identity, progress and final errors", () => {
  const tools = new ClaudeToolActivity();
  const start: SDKAssistantMessage = claudeAssistantMessage([{ type: "tool_use", id: "read", name: "Read", input: { file_path: "/workspace/file.ts" } }], "parent");
  const [running] = tools.accept(start);
  assert.equal(running.details?.parentId, "parent");
  assert.ok(running.details?.input?.includes("file.ts"));
  const progress: SDKToolProgressMessage = { type: "tool_progress", tool_use_id: "read", tool_name: "Read", parent_tool_use_id: "parent", elapsed_time_seconds: 2, uuid: randomUUID(), session_id: "session" };
  const [updated] = tools.accept(progress);
  assert.equal(updated.details?.durationMs, 2000);
  assert.equal(updated.details?.input, running.details?.input);
  const result: SDKUserMessage = claudeUserMessage([{ type: "tool_result", tool_use_id: "read", content: "Permission denied", is_error: true }], "parent");
  const [failed] = tools.accept(result);
  assert.equal(failed.label, "Read"); assert.equal(failed.state, "failed"); assert.equal(failed.output, "Permission denied");
  assert.deepEqual(tools.accept(progress), []);
});

test("Claude result content includes text and media labels without embedding binary data", () => {
  const tools = new ClaudeToolActivity();
  tools.accept(claudeAssistantMessage([{ type: "tool_use", id: "mcp", name: "mcp__docs__read", input: { token: "private", path: "visible" } }]));
  const [result] = tools.accept(claudeUserMessage([{ type: "tool_result", tool_use_id: "mcp", content: [{ type: "text", text: "Hello" }, { type: "image", source: { type: "base64", media_type: "image/png", data: "private-image" } }] }]));
  assert.equal(result.output, "Hello\n[image content]");
  assert.ok(!result.details?.input?.includes("private"));
  assert.equal(result.details?.category, "integration");
});

test("unresolved tools become unconfirmed or interrupted without changing finished tools", () => {
  const tools = new ClaudeToolActivity();
  tools.accept(claudeAssistantMessage([{ type: "tool_use", id: "command", name: "Bash", input: { command: "npm test" } }]));
  assert.equal(tools.finish("interrupted", "end")[0].state, "interrupted");
  assert.deepEqual(tools.finish("unconfirmed", "another-end"), []);
});

test("background tasks retain their own identity, progress, updates and final result", () => {
  const tools = new ClaudeToolActivity();
  const base = { task_id: "task", run_id: "task-run", tool_use_id: "parent", uuid: randomUUID(), session_id: "session" };
  const [start] = tools.accept({ ...base, type: "system", subtype: "task_started", description: "Index documents" });
  assert.equal(start.nativeId, "task:task-run"); assert.equal(start.details?.parentId, "parent");
  const [progress] = tools.accept({ ...base, uuid: randomUUID(), type: "system", subtype: "task_progress", description: "Index documents",
    summary: "Reading files", usage: { total_tokens: 0, tool_uses: 1, duration_ms: 100 } });
  assert.equal(progress.details?.detail, "Reading files");
  const [update] = tools.accept({ ...base, uuid: randomUUID(), type: "system", subtype: "task_updated", patch: { status: "failed", error: "Read failed" } });
  assert.equal(update.state, "failed"); assert.equal(update.output, "Read failed");
  const [finished] = tools.accept({ ...base, uuid: randomUUID(), type: "system", subtype: "task_notification", status: "failed", output_file: "/unused", summary: "Index failed" });
  assert.equal(finished.nativeId, start.nativeId); assert.equal(finished.state, "failed");
});

test("ambient task progress stays out of the chat and detached results do not finish a tool", () => {
  const tools = new ClaudeToolActivity();
  const base = { task_id: "ambient", uuid: randomUUID(), session_id: "session" };
  assert.deepEqual(tools.accept({ ...base, type: "system", subtype: "task_started", description: "Housekeeping", ambient: true }), []);
  assert.deepEqual(tools.accept({ ...base, uuid: randomUUID(), type: "system", subtype: "task_progress", description: "Housekeeping",
    usage: { total_tokens: 0, tool_uses: 0, duration_ms: 1 } }), []);
  tools.accept(claudeAssistantMessage([{ type: "tool_use", id: "fetch", name: "WebFetch", input: { url: "https://example.com" } }]));
  assert.deepEqual(tools.accept({ ...claudeUserMessage([{ type: "tool_result", tool_use_id: "fetch", content: "Still running" }]), tool_use_result: { detachedToolCall: true } }), []);
  assert.equal(tools.finish("unconfirmed", "end")[0].nativeId, "fetch");
});
