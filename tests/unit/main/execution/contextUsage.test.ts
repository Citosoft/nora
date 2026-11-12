import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { ModelUsage } from "@anthropic-ai/claude-agent-sdk";
import { EffectWorker } from "@main/execution/effectWorker";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { ClaudeStreamNormalizer } from "@main/providers/claude/streamNormalizer";
import { codexContextReading } from "@main/providers/codex/contextUsage";
import { fixture } from "./fixture";
import { claudeAssistantMessage, claudeResult } from "./toolFixtures";

const modelUsage = (contextWindow: number): ModelUsage => ({ inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0, webSearchRequests: 0, costUSD: 0, contextWindow, maxOutputTokens: 0 });
const reading = { usedTokens: 50_000, windowTokens: 200_000, inputTokens: 48_000, cachedInputTokens: 40_000, outputTokens: 2_000, updatedAt: "2026-10-21T10:00:30.000Z" };

test("context readings update the conversation while its turn is active and are ignored afterwards", (t) => {
  const f = fixture(t);
  f.create(); f.submit();
  const attemptId = f.snapshot().runs[0].attemptId;
  const accept = (eventId: string, context: typeof reading | null) =>
    f.engine.accept({ kind: "context", eventId, conversationId: "conversation", runId: "run", attemptId, context });
  assert.equal(f.snapshot().conversation.context, undefined);
  accept("context-1", reading);
  assert.deepEqual(f.snapshot().conversation.context, reading);
  accept("context-2", null);
  assert.equal(f.snapshot().conversation.context, null);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  accept("late", reading);
  assert.equal(f.snapshot().conversation.context, null);
});

test("compaction queues as a run with a timeline milestone and cannot be edited or steered", (t) => {
  const f = fixture(t);
  f.create(); f.submit();
  f.command({ kind: "submit", commandId: "compact", conversationId: "conversation", runId: "compact", instruction: "Compact context", action: "compact" });
  assert.equal(f.snapshot().runs[1].action, "compact");
  assert.throws(() => f.command({ kind: "edit-queued", commandId: "edit", conversationId: "conversation", runId: "compact", instruction: "x" }), /no instruction to edit/);
  f.update({ kind: "started", eventId: "started", nativeConversationId: "native", nativeTurnId: "turn" });
  assert.throws(() => f.command({ kind: "steer-queued", commandId: "steer", conversationId: "conversation", runId: "compact", targetRunId: "run" }), /Steering requires/);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  const run = f.snapshot().runs[1];
  assert.equal(run.state, "starting");
  assert.deepEqual(f.snapshot().items.at(-1), { id: JSON.stringify(["compact", "instruction"]), runId: "compact",
    createdAt: "2026-10-21T10:00:00.000Z", kind: "milestone", text: "Compact context" });
});

test("the worker fails compaction for providers without the capability instead of sending it as a prompt", async (t) => {
  const f = fixture(t);
  const registry = new ProviderRegistry();
  let starts = 0;
  registry.register({ kind: "codex", instanceId: "account-a", capabilities: nativeCapabilities,
    async catalog() { return { status: "unavailable", failure: { code: "unsupported", message: "Test double", retryable: false } }; },
    async close() {}, async start() { starts++; }, async interrupt() {}, async respond() {}, async reconcile() {} });
  f.create();
  f.command({ kind: "submit", commandId: "compact", conversationId: "conversation", runId: "compact", instruction: "Compact context", action: "compact" });
  await new EffectWorker(f.engine, registry).runNext();
  assert.equal(starts, 0);
  assert.equal(f.snapshot().runs[0].state, "failed");
  assert.equal(f.snapshot().runs[0].failure?.code, "unsupported");
});

test("Claude reports the latest top-level request against its model's context window", () => {
  const stream = new ClaudeStreamNormalizer();
  const assistant = claudeAssistantMessage([{ type: "text", text: "Done", citations: null }]);
  assistant.message.usage = { ...assistant.message.usage, input_tokens: 1_000, cache_creation_input_tokens: 2_000, cache_read_input_tokens: 30_000, output_tokens: 500 };
  stream.accept(assistant);
  const frames = stream.accept({ ...claudeResult("Done"), modelUsage: { fixture: modelUsage(200_000), haiku: modelUsage(100_000) } });
  const context = frames.find((frame) => frame.kind === "context");
  assert.deepEqual(context?.kind === "context" && context.context,
    { usedTokens: 33_500, windowTokens: 200_000, inputTokens: 33_000, cachedInputTokens: 30_000, outputTokens: 500 });
});

test("Claude compaction reports the compacted total, or an unknown context when it is not given", () => {
  const compacted = (postTokens?: number) => {
    const stream = new ClaudeStreamNormalizer();
    stream.accept({ type: "system", subtype: "compact_boundary", uuid: randomUUID(), session_id: "session",
      compact_metadata: { trigger: "manual", pre_tokens: 150_000, ...(postTokens === undefined ? {} : { post_tokens: postTokens }) } });
    const frame = stream.accept({ ...claudeResult(), modelUsage: { fixture: modelUsage(200_000) } }).find((entry) => entry.kind === "context");
    return frame?.kind === "context" ? frame.context : "missing";
  };
  assert.deepEqual(compacted(12_000), { usedTokens: 12_000, windowTokens: 200_000, inputTokens: 12_000, cachedInputTokens: 0, outputTokens: 0 });
  assert.equal(compacted(), null);
  assert.equal(new ClaudeStreamNormalizer().accept(claudeResult()).some((frame) => frame.kind === "context"), false);
});

test("Codex context uses the latest request and needs the model's context window", () => {
  const last = { inputTokens: 60_000, cachedInputTokens: 50_000, outputTokens: 1_500 };
  assert.deepEqual(codexContextReading({ total: last, last, modelContextWindow: 272_000 }),
    { usedTokens: 61_500, windowTokens: 272_000, inputTokens: 60_000, cachedInputTokens: 50_000, outputTokens: 1_500 });
  assert.equal(codexContextReading({ total: last, last, modelContextWindow: null }), null);
  assert.equal(codexContextReading({ total: last }), null);
});
