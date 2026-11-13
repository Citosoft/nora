import assert from "node:assert/strict";
import test from "node:test";
import { codexTotalUsage, EMPTY_CODEX_USAGE, updateCodexTurnUsage } from "@main/providers/codex/tokenUsage";
import { parseRolloutUsage } from "@main/providers/codex/rolloutContext";

test("Codex cache writes normalize from the native field without increasing input totals", () => {
  assert.deepEqual(codexTotalUsage({ inputTokens: 1000, outputTokens: 50, cachedInputTokens: 600, cacheWriteInputTokens: 300 }),
    { inputTokens: 1000, outputTokens: 50, cachedInputTokens: 600, cacheCreationInputTokens: 300 });
});

test("multiple request notifications measure the whole turn against one fixed baseline without double counting", () => {
  const baseline = { inputTokens: 10_000, outputTokens: 500, cachedInputTokens: 6_000, cacheCreationInputTokens: 2_000 };
  const first = updateCodexTurnUsage({ inputTokens: 11_000, outputTokens: 550, cachedInputTokens: 6_600, cacheCreationInputTokens: 2_200 }, baseline);
  assert.deepEqual(first.usage, { inputTokens: 1000, outputTokens: 50, cachedInputTokens: 600, cacheCreationInputTokens: 200 });
  const next = updateCodexTurnUsage({ inputTokens: 13_000, outputTokens: 700, cachedInputTokens: 8_000, cacheCreationInputTokens: 2_800 }, first.baseline);
  assert.deepEqual(next.usage, { inputTokens: 3000, outputTokens: 200, cachedInputTokens: 2000, cacheCreationInputTokens: 800 });
  assert.deepEqual(updateCodexTurnUsage({ inputTokens: 0, outputTokens: 0 }, { ...EMPTY_CODEX_USAGE }).usage, { inputTokens: 0, outputTokens: 0 });
});

test("missing baselines and reset counters stay unknown even if later totals pass the original baseline", () => {
  const total = { inputTokens: 1000, outputTokens: 50 };
  assert.equal(updateCodexTurnUsage(total, null).usage, null);
  const reset = updateCodexTurnUsage({ inputTokens: 100, outputTokens: 5 }, total);
  assert.equal(reset.usage, null);
  assert.equal(updateCodexTurnUsage({ inputTokens: 2000, outputTokens: 100 }, reset.baseline).usage, null);
  assert.deepEqual(updateCodexTurnUsage({ ...total, cachedInputTokens: 500 }, { inputTokens: 500, outputTokens: 10 }).usage,
    { inputTokens: 500, outputTokens: 40 }, "an unreported baseline cache count is not zero");
});

test("a reset cache counter does not invalidate measured input but cannot silently become known again", () => {
  const reset = updateCodexTurnUsage({ inputTokens: 2000, outputTokens: 100, cachedInputTokens: 10 },
    { inputTokens: 1000, outputTokens: 50, cachedInputTokens: 500 });
  assert.deepEqual(reset.usage, { inputTokens: 1000, outputTokens: 50 });
  assert.deepEqual(updateCodexTurnUsage({ inputTokens: 3000, outputTokens: 200, cachedInputTokens: 1000 }, reset.baseline).usage,
    { inputTokens: 2000, outputTokens: 150 });
});

test("rollout accounting keeps cumulative totals separate from the latest request's context", () => {
  const parsed = parseRolloutUsage(JSON.stringify({ type: "event_msg", payload: { type: "token_count", info: {
    total_token_usage: { input_tokens: 10_000, output_tokens: 500, cached_input_tokens: 6_000, cache_write_input_tokens: 2_000 },
    last_token_usage: { input_tokens: 1000, output_tokens: 50, cached_input_tokens: 600, cache_write_input_tokens: 200 }, model_context_window: 200_000
  } } }));
  assert.deepEqual(parsed?.total, { inputTokens: 10_000, outputTokens: 500, cachedInputTokens: 6_000, cacheCreationInputTokens: 2_000 });
  assert.equal(parsed?.context?.usedTokens, 1050);
  assert.equal(parsed?.context?.cacheCreationInputTokens, 200);
});
