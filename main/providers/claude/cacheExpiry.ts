import type { ClaudeRequestUsage } from "@main/types/execution/claude.types";

/** Use only a lifetime explicitly reported for newly cached tokens, choosing the shortest in a mixed request. */
export function claudeCacheExpiry(usage: ClaudeRequestUsage, requestStartedAt: number): string | undefined {
  const writes = usage.cache_creation;
  const minutes = writes && writes.ephemeral_5m_input_tokens > 0 ? 5
    : writes && writes.ephemeral_1h_input_tokens > 0 ? 60 : null;
  if (!minutes || !Number.isFinite(requestStartedAt)) return undefined;
  const expiry = requestStartedAt + minutes * 60_000;
  return expiry > 0 && expiry <= 8.64e15 ? new Date(expiry).toISOString() : undefined;
}
