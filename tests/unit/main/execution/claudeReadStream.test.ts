import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeMessageStream } from "@main/types/execution/claude.types";
import { readClaudeStream } from "@main/providers/claude/readStream";
import { claudeAssistantMessage, claudeResult } from "./toolFixtures";

test("native compaction policy is read before the turn's reading ends and failed reads do not fail the turn", async () => {
  for (const fail of [false, true]) {
    let closed = false;
    const source: ClaudeMessageStream = { close() { closed = true; }, async *[Symbol.asyncIterator](): AsyncGenerator<SDKMessage> {
      yield claudeAssistantMessage([{ type: "text", text: "Done", citations: null }]);
      const result = claudeResult();
      result.modelUsage = { fixture: { inputTokens: 1, outputTokens: 1, cacheReadInputTokens: 0, cacheCreationInputTokens: 0,
        webSearchRequests: 0, costUSD: 0, contextWindow: 1_000_000, maxOutputTokens: 0 } };
      yield result;
    } };
    const frames = await collect(readClaudeStream(source, 5, async () => {
      assert.equal(closed, false);
      if (fail) throw new Error("Policy unavailable");
      return 900_000;
    }));
    const context = frames.find((frame) => frame.kind === "context");
    assert.ok(context?.kind === "context");
    assert.equal(context.context?.autoCompactThreshold, fail ? undefined : 900_000);
    assert.ok(frames.some((frame) => frame.kind === "finished" && frame.status === "completed"));
  }
});

async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of source) values.push(value);
  return values;
}

test("completion is delivered before a later suggestion, and the suggestion ends the turn's reading", async () => {
  const source: ClaudeMessageStream = { close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<SDKMessage> {
    yield claudeResult();
    yield { type: "prompt_suggestion", uuid: randomUUID(), session_id: "session", suggestion: "Run the tests." };
    throw new Error("Reading must stop after the suggestion");
  } };
  const stream = readClaudeStream(source);
  const result = await stream.next(); assert.ok(!result.done);
  assert.equal(result.value.kind, "finished");
  const suggestion = await stream.next(); assert.ok(!suggestion.done);
  assert.equal(suggestion.value.kind, "prompt-suggestion");
  assert.equal((await stream.next()).done, true);
});

test("a turn without a suggestion ends normally and an optional tail failure preserves completion", async () => {
  for (const fail of [false, true]) {
    const source: ClaudeMessageStream = { close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<SDKMessage> {
      yield claudeResult();
      if (fail) throw new Error("Prediction unavailable");
    } };
    const frames = await collect(readClaudeStream(source));
    assert.deepEqual(frames.map((frame) => frame.kind), ["finished"]);
  }
});

test("an absent post-turn message cannot hold the turn open indefinitely", async () => {
  let release = (): void => {};
  let closed = false;
  const stop = new Promise<void>((resolve) => { release = resolve; });
  const source: ClaudeMessageStream = { close() { closed = true; release(); }, async *[Symbol.asyncIterator](): AsyncGenerator<SDKMessage> {
    yield claudeResult(); await stop;
  } };
  const [frames] = await Promise.all([collect(readClaudeStream(source, 5)), delay(20)]);
  assert.equal(closed, true);
  assert.deepEqual(frames.map((frame) => frame.kind), ["finished"]);
});

test("a connection failure before the result remains a real execution failure", async () => {
  const source: ClaudeMessageStream = { close() {}, async *[Symbol.asyncIterator](): AsyncGenerator<SDKMessage> { throw new Error("Disconnected"); } };
  await assert.rejects(collect(readClaudeStream(source)), /Disconnected/);
});
