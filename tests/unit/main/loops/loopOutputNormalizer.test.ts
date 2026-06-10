import { createLoopOutputNormalizer } from "@main/loops/output/createLoopOutputNormalizer";
import type { LoopOutputEvent } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createNormalizer(toolId: string) {
  let id = 0;
  return createLoopOutputNormalizer({
    turnId: "turn-1",
    roleId: "writer",
    roleName: "Writer",
    roleKind: "writer",
    toolId,
    iteration: 1,
    token: "token-1",
    nowIso: () => "2026-06-10T12:00:00.000Z",
    randomId: () => `event-${++id}`
  });
}

test("codex output normalizer converts chunked JSONL into provider-neutral events", () => {
  const normalizer = createNormalizer("codex");
  const events: LoopOutputEvent[] = [];
  const jsonl = [
    JSON.stringify({ type: "item.completed", item: { type: "command_execution", command: "npm test", aggregated_output: "ok\n", exit_code: 0 } }),
    JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: '## Done\n<nora-loop-result token="token-1" outcome="complete">Shipped.\n</nora-loop-result>' } }),
    JSON.stringify({ type: "turn.completed", usage: { input_tokens: 120, cached_input_tokens: 40, output_tokens: 30 } })
  ].join("\n") + "\n";
  const splitAt = jsonl.indexOf("item.completed", 20) + 9;
  events.push(...normalizer.push(jsonl.slice(0, splitAt)));
  events.push(...normalizer.push(jsonl.slice(splitAt)));
  events.push(...normalizer.finish(""));

  assert.deepEqual(events.map((event) => event.kind), ["tool", "message", "result", "usage"]);
  assert.equal(events.find((event) => event.kind === "tool")?.status, "completed");
  assert.equal(events.find((event) => event.kind === "result")?.summary, "Shipped.");
  assert.equal(events.filter((event) => event.kind === "result").length, 1);
  assert.match(normalizer.getProtocolText(), /token-1/);
});

test("claude output normalizer converts stream-json into provider-neutral events", () => {
  const normalizer = createNormalizer("claude");
  const events: LoopOutputEvent[] = [];
  const jsonl = [
    JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "## Progress\n\nImplemented the change." },
          { type: "tool_use", name: "Bash", input: { command: "npm test" } }
        ]
      }
    }),
    JSON.stringify({
      type: "user",
      message: {
        content: [{ type: "tool_result", tool_use_id: "tool-1", content: "ok\n" }]
      }
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        content: [{ type: "text", text: '<nora-loop-result token="token-1" outcome="complete">\nReady.\n</nora-loop-result>' }]
      }
    }),
    JSON.stringify({
      type: "result",
      subtype: "success",
      usage: { input_tokens: 120, cache_read_input_tokens: 40, output_tokens: 30 }
    })
  ].join("\n") + "\n";

  events.push(...normalizer.push(jsonl));
  events.push(...normalizer.finish(""));

  assert.equal(events.filter((event) => event.kind === "message").length, 1);
  assert.equal(events.filter((event) => event.kind === "tool").length, 2);
  assert.equal(events.find((event) => event.kind === "result")?.summary, "Ready.");
  assert.equal(events.find((event) => event.kind === "usage")?.inputTokens, 120);
  assert.match(normalizer.getProtocolText(), /token-1/);
});

test("gemini output normalizer converts stream-json into provider-neutral events", () => {
  const normalizer = createNormalizer("gemini");
  const events: LoopOutputEvent[] = [];
  const jsonl = [
    JSON.stringify({ type: "init", timestamp: "2026-06-10T12:00:00.000Z", session_id: "session-1", model: "gemini-2.5-flash" }),
    JSON.stringify({ type: "message", timestamp: "2026-06-10T12:00:01.000Z", role: "assistant", content: "## Progress\n\n", delta: true }),
    JSON.stringify({ type: "message", timestamp: "2026-06-10T12:00:02.000Z", role: "assistant", content: "Implemented the change.", delta: true }),
    JSON.stringify({
      type: "tool_use",
      timestamp: "2026-06-10T12:00:03.000Z",
      tool_name: "Shell",
      tool_id: "shell-1",
      parameters: { command: "npm test" }
    }),
    JSON.stringify({
      type: "tool_result",
      timestamp: "2026-06-10T12:00:04.000Z",
      tool_id: "shell-1",
      status: "success",
      output: "ok\n"
    }),
    JSON.stringify({
      type: "message",
      timestamp: "2026-06-10T12:00:05.000Z",
      role: "assistant",
      content: '<nora-loop-result token="token-1" outcome="complete">\nReady.\n</nora-loop-result>',
      delta: false
    }),
    JSON.stringify({
      type: "result",
      timestamp: "2026-06-10T12:00:06.000Z",
      status: "success",
      stats: { total_tokens: 150, input_tokens: 120, output_tokens: 30, cached: 40, input: 120, duration_ms: 900, tool_calls: 1, models: {} }
    })
  ].join("\n") + "\n";

  events.push(...normalizer.push(jsonl));
  events.push(...normalizer.finish(""));

  assert.equal(events.filter((event) => event.kind === "message").length, 1);
  assert.equal(events.filter((event) => event.kind === "tool").length, 2);
  assert.equal(events.find((event) => event.kind === "result")?.summary, "Ready.");
  assert.equal(events.find((event) => event.kind === "usage")?.cachedInputTokens, 40);
  assert.match(normalizer.getProtocolText(), /token-1/);
});

test("plaintext output normalizer preserves markdown and extracts workflow results", () => {
  const normalizer = createNormalizer("cursor");
  const events = [
    ...normalizer.push("## Progress\n\nImplemented the change.\n\n"),
    ...normalizer.push('<nora-loop-result token="token-1" outcome="complete">\nReady.\n</nora-loop-result>'),
    ...normalizer.finish("")
  ];

  assert.equal(events.filter((event) => event.kind === "message").length, 1);
  assert.equal(events.find((event) => event.kind === "result")?.summary, "Ready.");
});
