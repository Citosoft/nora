import { z } from "zod";
import type { ContextReading } from "@shared/types/conversation/contracts.types";
import { findLastLine } from "@main/helpers/findLastLine";
import { codexContextReading } from "./contextUsage";

const tokens = z.number().int().nonnegative();
const breakdownSchema = z.object({ input_tokens: tokens, cached_input_tokens: tokens.optional(), output_tokens: tokens });
const tokenCountSchema = z.object({ type: z.literal("event_msg"), payload: z.object({ type: z.literal("token_count"),
  info: z.object({ total_token_usage: breakdownSchema, last_token_usage: breakdownSchema, model_context_window: z.number().int().positive().nullable().optional() }) }) });

const camel = (usage: z.infer<typeof breakdownSchema>) =>
  ({ inputTokens: usage.input_tokens, cachedInputTokens: usage.cached_input_tokens, outputTokens: usage.output_tokens });

/** Parses one rollout line; only `token_count` events that carry usage measure context. */
export function parseRolloutContext(line: string): ContextReading | null {
  if (!line.includes("\"token_count\"")) return null;
  try {
    const event = tokenCountSchema.safeParse(JSON.parse(line));
    if (!event.success) return null;
    const { info } = event.data.payload;
    return codexContextReading({ total: camel(info.total_token_usage), last: camel(info.last_token_usage), modelContextWindow: info.model_context_window ?? null });
  } catch { return null; }
}

/** The latest context measurement Codex saved for a thread, read from the end of its rollout file. */
export function readRolloutContext(path: string): Promise<ContextReading | null> {
  return findLastLine(path, parseRolloutContext);
}
