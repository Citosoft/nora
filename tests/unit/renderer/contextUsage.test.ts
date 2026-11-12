import assert from "node:assert/strict";
import test from "node:test";
import { compactContextCommand, contextCompactionState, contextGauge, describeContextUsage, formatTokenCount } from "@/components/app/logic/contextUsage";
import type { ConversationRun } from "@shared/types/conversation/contracts.types";

const context = { usedTokens: 180_000, windowTokens: 200_000, inputTokens: 178_000, cachedInputTokens: 0, outputTokens: 2_000, updatedAt: "2026-11-11T00:00:00.000Z" };

test("context gauge reports percent, tone and remaining tokens", () => {
  assert.deepEqual(contextGauge(context), { percentUsed: 90, tone: "critical", remainingTokens: 20_000 });
  assert.equal(contextGauge({ ...context, usedTokens: 250_000 }).percentUsed, 100);
  assert.equal(describeContextUsage(context), "90% used, 180k of 200k tokens");
  assert.equal(describeContextUsage(null), "Context was compacted; usage updates after the next response");
  assert.equal(describeContextUsage(undefined), "Context usage appears after the next response");
});

test("token counts format compactly", () => {
  assert.deepEqual([950, 12_345, 200_000, 1_500_000].map(formatTokenCount), ["950", "12.3k", "200k", "1.5M"]);
});

test("compaction is in progress while a compact run exists, otherwise follows idleness", () => {
  const run = { action: "compact" } as const satisfies Partial<ConversationRun>;
  assert.equal(contextCompactionState([{ ...queued, ...run }], true), "compacting");
  assert.equal(contextCompactionState([], true), "available");
  assert.equal(contextCompactionState([queued], false), "blocked");
  let id = 0;
  assert.deepEqual(compactContextCommand("conversation", () => `id-${++id}`),
    { kind: "submit", commandId: "id-1", conversationId: "conversation", runId: "id-2", instruction: "Compact context", action: "compact" });
});

const queued: ConversationRun = { id: "run", conversationId: "conversation", instruction: "Next", state: "queued", attemptId: "attempt",
  nativeTurnId: null, createdAt: "2026-11-11T00:00:00.000Z", updatedAt: "2026-11-11T00:00:00.000Z", failure: null, usage: null, review: "pending" };
