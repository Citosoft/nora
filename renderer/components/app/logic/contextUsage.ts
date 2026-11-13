import type { ContextUsage, ConversationCommand, ConversationRun } from "@shared/types/conversation/contracts.types";
import type { ContextCompactionState, ContextGauge } from "@/components/app/types/contextUsage.types";
import { usageTone } from "./usageRings";

/** Shown in the timeline in place of a user message when compaction runs. */
export const COMPACT_CONTEXT_INSTRUCTION = "Compact context";

export function contextGauge(context: ContextUsage): ContextGauge {
  const percentUsed = Math.min(100, Math.round((context.usedTokens / context.windowTokens) * 100));
  return { percentUsed, tone: usageTone(percentUsed), remainingTokens: Math.max(0, context.windowTokens - context.usedTokens) };
}

const TOKEN_UNITS: ReadonlyArray<{ size: number; suffix: string }> = [{ size: 1_000_000, suffix: "M" }, { size: 1_000, suffix: "k" }];

/** Compact token counts: 950, 12.3k, 200k, 1.5M. */
export function formatTokenCount(tokens: number): string {
  const unit = TOKEN_UNITS.find((entry) => tokens >= entry.size);
  if (!unit) return String(tokens);
  const scaled = tokens / unit.size;
  return `${scaled >= 100 ? Math.round(scaled) : Number(scaled.toFixed(1))}${unit.suffix}`;
}

export function describeContextUsage(context: ContextUsage | null | undefined): string {
  if (context === undefined) return "Context usage appears after the next response";
  if (!context) return "Context was compacted; usage updates after the next response";
  const gauge = contextGauge(context);
  return `${gauge.percentUsed}% used, ${formatTokenCount(context.usedTokens)} of ${formatTokenCount(context.windowTokens)} tokens`;
}

/** Cache reuse reduces input processing, but cached tokens still occupy the context window. */
export function contextCacheHitPercent(context: ContextUsage): number | null {
  if (!context.inputTokens) return null;
  return Math.min(100, Math.round(context.cachedInputTokens / context.inputTokens * 100));
}

/** Compaction waits behind other work; a queued or running compaction shows as in progress. */
export function contextCompactionState(runs: ReadonlyArray<ConversationRun>, idle: boolean): ContextCompactionState {
  if (runs.some((run) => run.action === "compact")) return "compacting";
  return idle ? "available" : "blocked";
}

export function compactContextCommand(conversationId: string, newId: () => string): Extract<ConversationCommand, { kind: "submit" }> {
  return { kind: "submit", commandId: newId(), conversationId, runId: newId(), instruction: COMPACT_CONTEXT_INSTRUCTION, action: "compact" };
}
