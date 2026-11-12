import type { ModelUsage } from "@anthropic-ai/claude-agent-sdk";
import type { ContextReading } from "@shared/types/conversation/contracts.types";
import type { ClaudeRequestUsage } from "@main/types/execution/claude.types";

/** The context window of the model that served the latest top-level request, else the largest one reported. */
export function claudeContextWindow(modelUsage: Readonly<Record<string, ModelUsage>>, model: string | null): number | null {
  const entries = Object.entries(modelUsage);
  const own = model ? entries.find(([key]) => key === model)?.[1] : undefined;
  const window = own?.contextWindow ?? Math.max(0, ...entries.map(([, usage]) => usage.contextWindow));
  return window > 0 ? window : null;
}

/** Claude counts cache reads and writes apart from `input_tokens`; all of them occupy the context. */
export function claudeContextReading(usage: ClaudeRequestUsage, windowTokens: number): ContextReading {
  const inputTokens = usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
  return { usedTokens: inputTokens + usage.output_tokens, windowTokens, inputTokens,
    cachedInputTokens: usage.cache_read_input_tokens ?? 0, outputTokens: usage.output_tokens };
}

/** After compaction only the remaining total is known; it is all prompt context for the next request. */
export function claudeCompactedReading(postTokens: number | undefined, windowTokens: number | null): ContextReading | null {
  return postTokens !== undefined && windowTokens
    ? { usedTokens: postTokens, windowTokens, inputTokens: postTokens, cachedInputTokens: 0, outputTokens: 0 }
    : null;
}
