import type { ExecutionUsage } from "@shared/types/conversation/contracts.types";
import type { ClaudeRequestUsage } from "@main/types/execution/claude.types";

/** Anthropic reports cache reads and writes outside input_tokens; normalize them once at the boundary. */
export function claudeTokenUsage(usage: ClaudeRequestUsage): ExecutionUsage {
  return {
    inputTokens: usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0),
    outputTokens: usage.output_tokens,
    ...(usage.cache_read_input_tokens != null ? { cachedInputTokens: usage.cache_read_input_tokens } : {}),
    ...(usage.cache_creation_input_tokens != null ? { cacheCreationInputTokens: usage.cache_creation_input_tokens } : {})
  };
}
