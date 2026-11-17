import type { ExecutionUsage } from "@shared/types/conversation/contracts.types";
import type { CodexTokenBreakdown, CodexUsageUpdate } from "@main/types/execution/codex.types";

export const EMPTY_CODEX_USAGE: Readonly<ExecutionUsage> = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, cacheCreationInputTokens: 0 };

/** Codex includes both cache reads and writes in inputTokens; never add either a second time. */
export function codexTotalUsage(total: CodexTokenBreakdown): ExecutionUsage {
  return { inputTokens: total.inputTokens, outputTokens: total.outputTokens,
    ...(total.cachedInputTokens !== undefined ? { cachedInputTokens: total.cachedInputTokens } : {}),
    ...(total.cacheWriteInputTokens !== undefined ? { cacheCreationInputTokens: total.cacheWriteInputTokens } : {}) };
}

/** A missing baseline or a counter reset cannot establish this turn's usage. Optional counters stay unknown unless both ends reported them. */
export function updateCodexTurnUsage(total: ExecutionUsage, baseline: ExecutionUsage | null): CodexUsageUpdate {
  if (!baseline || total.inputTokens < baseline.inputTokens || total.outputTokens < baseline.outputTokens) return { baseline: null, usage: null };
  const inputTokens = total.inputTokens - baseline.inputTokens;
  const cached = total.cachedInputTokens !== undefined && baseline.cachedInputTokens !== undefined
    ? total.cachedInputTokens - baseline.cachedInputTokens : undefined;
  const written = total.cacheCreationInputTokens !== undefined && baseline.cacheCreationInputTokens !== undefined
    ? total.cacheCreationInputTokens - baseline.cacheCreationInputTokens : undefined;
  // Once a reset is observed, later counters passing the old baseline cannot restore its provenance.
  const nextBaseline = { ...baseline,
    ...(cached !== undefined && cached < 0 ? { cachedInputTokens: undefined } : {}),
    ...(written !== undefined && written < 0 ? { cacheCreationInputTokens: undefined } : {}) };
  return { baseline: nextBaseline, usage: { inputTokens, outputTokens: total.outputTokens - baseline.outputTokens,
    ...(cached !== undefined && cached >= 0 && cached <= inputTokens ? { cachedInputTokens: cached } : {}),
    ...(written !== undefined && written >= 0 && written <= inputTokens ? { cacheCreationInputTokens: written } : {}) } };
}
