import type { AiProvider, AiRuntimeTaskProvider } from "@shared/types/ai.types";
import type { MemoryReviewRecord } from "@shared/types/bots/memoryReview.types";

const isRuntime = (provider: string): provider is AiRuntimeTaskProvider => provider === "codex" || provider === "claude";
const isAiProvider = (provider: string): provider is AiProvider => provider === "openai" || provider === "google" || provider === "anthropic";

/** Which logo a recorded source gets; recorded providers are plain strings so old records survive new sources. */
export function reviewSourceKind(provider: string): { kind: "runtime"; provider: AiRuntimeTaskProvider } | { kind: "cloud"; provider: AiProvider } | { kind: "other" } {
  if (isRuntime(provider)) return { kind: "runtime", provider };
  if (isAiProvider(provider)) return { kind: "cloud", provider };
  return { kind: "other" };
}

/** 950, 12.4k, 3.1M. */
export function formatTokens(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

/** What a review changed, or why it failed, in a few words. */
export function describeReview(record: MemoryReviewRecord): string {
  if (record.status === "failed") return record.error ?? "Failed";
  const outcome = record.outcome;
  if (!outcome) return "No changes";
  const parts = [[outcome.added, "added"], [outcome.updated, "updated"], [outcome.forgotten, "forgotten"]] as const;
  const changes = parts.filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`);
  return changes.length ? changes.join(" · ") : "No changes";
}
