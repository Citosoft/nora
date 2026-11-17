import type { ContextUsage } from "@shared/types/conversation/contracts.types";

export const IDLE_COMPACTION_MIN_TOKENS = 200_000;
export const IDLE_COMPACTION_LEAD_MS = 120_000;

/** Unknown cache lifetimes never trigger an action; expiry is an estimate, not a guaranteed cache hit. */
export function cacheCompactionAdvice(context: ContextUsage | null | undefined, now: number): "none" | "expiring" | "expired" {
  if (!context?.promptCacheExpiresAt || context.usedTokens < IDLE_COMPACTION_MIN_TOKENS || !Number.isFinite(now)) return "none";
  const expiry = Date.parse(context.promptCacheExpiresAt);
  if (!Number.isFinite(expiry)) return "none";
  if (now >= expiry) return "expired";
  return now >= expiry - IDLE_COMPACTION_LEAD_MS ? "expiring" : "none";
}
