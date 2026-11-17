import type { z } from "zod";
import type { ContextReading } from "@shared/types/conversation/contracts.types";
import type { usageEventSchema } from "./nativeSchemas";

/** Codex `inputTokens` already include cached prompt tokens; occupancy is the latest request's input plus output. */
export function codexContextReading(tokenUsage: z.infer<typeof usageEventSchema>["tokenUsage"]): ContextReading | null {
  const { last, modelContextWindow } = tokenUsage;
  if (!last || !modelContextWindow) return null;
  return { usedTokens: last.inputTokens + last.outputTokens, windowTokens: modelContextWindow, inputTokens: last.inputTokens,
    ...(last.cacheWriteInputTokens !== undefined ? { cacheCreationInputTokens: last.cacheWriteInputTokens } : {}),
    cachedInputTokens: last.cachedInputTokens ?? 0, outputTokens: last.outputTokens };
}
