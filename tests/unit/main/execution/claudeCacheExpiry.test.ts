import assert from "node:assert/strict";
import test from "node:test";
import { claudeCacheExpiry } from "@main/providers/claude/cacheExpiry";
import { ClaudeStreamNormalizer } from "@main/providers/claude/streamNormalizer";
import { claudeAssistantMessage, claudeResult } from "./toolFixtures";

const start = Date.parse("2026-01-01T00:00:00Z");
const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 100,
  cache_creation: { ephemeral_1h_input_tokens: 100, ephemeral_5m_input_tokens: 0 } };

test("cache expiry uses reported lifetimes, conservatively choosing the shortest, and leaves unknowns unknown", () => {
  assert.equal(claudeCacheExpiry(usage, start), "2026-01-01T01:00:00.000Z");
  assert.equal(claudeCacheExpiry({ ...usage, cache_creation: { ephemeral_1h_input_tokens: 100, ephemeral_5m_input_tokens: 10 } }, start), "2026-01-01T00:05:00.000Z");
  assert.equal(claudeCacheExpiry({ input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 100 }, start), undefined);
  assert.equal(claudeCacheExpiry({ ...usage, cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 } }, start), undefined);
  assert.equal(claudeCacheExpiry(usage, Number.NaN), undefined);
});

test("Claude carries cache expiry and native compaction policy on the latest main-loop context", () => {
  const normalizer = new ClaudeStreamNormalizer(start);
  const assistant = claudeAssistantMessage([{ type: "text", text: "Done", citations: null }]);
  assistant.message.usage = { ...assistant.message.usage, ...usage };
  normalizer.accept(assistant);
  const result = claudeResult("Done");
  result.modelUsage = { fixture: { inputTokens: 1, outputTokens: 1, cacheReadInputTokens: 0, cacheCreationInputTokens: 100,
    webSearchRequests: 0, costUSD: 0, contextWindow: 1_000_000, maxOutputTokens: 0 } };
  const context = normalizer.accept(result, 900_000).find((frame) => frame.kind === "context");
  assert.ok(context?.kind === "context");
  assert.equal(context.context?.promptCacheExpiresAt, "2026-01-01T01:00:00.000Z");
  assert.equal(context.context?.autoCompactThreshold, 900_000);
  const next = claudeAssistantMessage([{ type: "text", text: "Cached", citations: null }]);
  next.message.usage = { ...next.message.usage, cache_read_input_tokens: 100 };
  normalizer.accept(next);
  const unknown = normalizer.accept(result).find((frame) => frame.kind === "context");
  assert.ok(unknown?.kind === "context"); assert.equal(unknown.context?.promptCacheExpiresAt, undefined);
});
