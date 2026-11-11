import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { SDKAssistantMessage, SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { ClaudeStreamNormalizer } from "@main/providers/claude/streamNormalizer";
import { claudeMessage as message, claudeUsage } from "./toolFixtures";

function partial(event: SDKPartialAssistantMessage["event"]): SDKPartialAssistantMessage {
  return { type: "stream_event", event, uuid: randomUUID(), parent_tool_use_id: null, session_id: "session" };
}
function finalBlock(text: string): SDKAssistantMessage {
  return { type: "assistant", message: message([{ type: "text", text, citations: null }]), uuid: randomUUID(), parent_tool_use_id: null, session_id: "session" };
}

test("Claude block completion does not prematurely freeze a multi-block streamed message", () => {
  const stream = new ClaudeStreamNormalizer();
  stream.accept(partial({ type: "message_start", message: message([]) }));
  stream.accept(partial({ type: "content_block_start", index: 0, content_block: { type: "text", text: "", citations: null } }));
  stream.accept(partial({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "First" } }));
  const first = stream.accept(finalBlock("First"));
  assert.deepEqual(first.map((frame) => "complete" in frame && frame.complete), [false]);
  stream.accept(partial({ type: "content_block_start", index: 1, content_block: { type: "text", text: "", citations: null } }));
  const second = stream.accept(partial({ type: "content_block_delta", index: 1, delta: { type: "text_delta", text: " second" } }));
  assert.equal(second[0].kind === "text" && second[0].text, "First second");
  stream.accept(finalBlock(" second"));
  const end = stream.accept(partial({ type: "message_stop" }));
  assert.equal(end.length, 1);
  assert.equal(end[0].kind === "text" && end[0].text, "First second");
  assert.equal(end[0].kind === "text" && end[0].complete, true);
  assert.equal(end[0].kind === "text" && end[0].nativeId, "native-message");
});

test("Claude reasoning and prose reconcile independently within a message", () => {
  const stream = new ClaudeStreamNormalizer();
  stream.accept(partial({ type: "message_start", message: message([]) }));
  stream.accept(partial({ type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "", signature: "" } }));
  stream.accept(partial({ type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "Reason", estimated_tokens: null } }));
  stream.accept(partial({ type: "content_block_start", index: 1, content_block: { type: "text", text: "", citations: null } }));
  stream.accept(partial({ type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "Answer" } }));
  const frames = stream.accept(partial({ type: "message_stop" }));
  assert.deepEqual(frames.map((frame) => "text" in frame ? [frame.kind, frame.text, frame.complete] : []), [["text", "Answer", true], ["reasoning", "Reason", true]]);
});

test("Claude preserves a rejected limit reset in the normalized failure", () => {
  const stream = new ClaudeStreamNormalizer();
  const seconds = Date.parse("2026-11-10T12:00:00Z") / 1000;
  stream.accept({ type: "rate_limit_event", uuid: randomUUID(), session_id: "session", rate_limit_info: { status: "rejected", resetsAt: seconds } });
  const frames = stream.accept({ type: "result", subtype: "error_during_execution", uuid: randomUUID(), session_id: "session",
    duration_ms: 0, duration_api_ms: 0, is_error: true, num_turns: 1, stop_reason: null, total_cost_usd: 0, modelUsage: {}, permission_denials: [], errors: ["Limit reached"],
    usage: claudeUsage() });
  const frame = frames.find((entry) => entry.kind === "finished");
  assert.equal(frame?.kind, "finished");
  if (frame?.kind === "finished") assert.deepEqual(frame.failure, { code: "usage-limit", message: "Claude usage limit reached", retryable: true, resetsAt: "2026-11-10T12:00:00.000Z" });
});

test("Claude prompt suggestions normalize separately from assistant output and discard invalid values", () => {
  const stream = new ClaudeStreamNormalizer();
  const suggestion = { type: "prompt_suggestion" as const, uuid: randomUUID(), session_id: "session", suggestion: "  Run the tests.  " };
  assert.deepEqual(stream.accept(suggestion), [{ kind: "prompt-suggestion", eventId: suggestion.uuid, suggestion: "Run the tests." }]);
  assert.deepEqual(stream.accept({ ...suggestion, suggestion: " \n " }), []);
  assert.deepEqual(stream.accept({ ...suggestion, suggestion: "x".repeat(4001) }), []);
});
