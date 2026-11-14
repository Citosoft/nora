import { z } from "zod";

/** How many days the activity totals cover. */
export const MEMORY_REVIEW_ACTIVITY_DAYS = 7;
export const memoryReviewActivityChannel = "bot-memory:review-activity";

const count = z.number().int().nonnegative();
const usageSchema = z.object({ inputTokens: count, outputTokens: count }).strict();
/** One background review that called a model; reviews that found nothing new never reach the model and are not listed. */
export const memoryReviewRecordSchema = z.object({
  id: z.string().min(1).max(512),
  conversationId: z.string().min(1).max(512),
  threadTitle: z.string().max(200),
  ownerName: z.string().max(100),
  at: z.string().datetime(),
  durationMs: count,
  /** The source that answered, such as claude, codex or openai. */
  provider: z.string().min(1).max(64),
  model: z.string().max(512).nullable(),
  status: z.enum(["completed", "failed"]),
  outcome: z.object({ added: count, updated: count, forgotten: count, skipped: count }).strict().nullable(),
  /** Null when the source did not report usage. */
  usage: usageSchema.nullable(),
  error: z.string().max(500).nullable()
}).strict();
export const memoryReviewActivitySchema = z.object({
  since: z.string().datetime(),
  totals: z.object({ reviews: count, failed: count, inputTokens: count, outputTokens: count, unmetered: count }).strict(),
  recent: z.array(memoryReviewRecordSchema).max(50)
}).strict();
export const memoryReviewActivityReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), activity: memoryReviewActivitySchema }).strict(),
  z.object({ ok: z.literal(false), message: z.string().min(1) }).strict()
]);
