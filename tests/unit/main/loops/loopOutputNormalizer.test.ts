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

test("plaintext output normalizer preserves markdown and extracts workflow results", () => {
  const normalizer = createNormalizer("claude");
  const events = [
    ...normalizer.push("## Progress\n\nImplemented the change.\n\n"),
    ...normalizer.push('<nora-loop-result token="token-1" outcome="complete">\nReady.\n</nora-loop-result>'),
    ...normalizer.finish("")
  ];

  assert.equal(events.filter((event) => event.kind === "message").length, 1);
  assert.equal(events.find((event) => event.kind === "result")?.summary, "Ready.");
});
