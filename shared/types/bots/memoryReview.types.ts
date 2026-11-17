import type { z } from "zod";
import type { memoryReviewActivityReplySchema, memoryReviewActivitySchema, memoryReviewRecordSchema } from "@shared/bots/memoryReviewActivity";

export type MemoryReviewRecord = z.infer<typeof memoryReviewRecordSchema>;
export type MemoryReviewActivity = z.infer<typeof memoryReviewActivitySchema>;
export type MemoryReviewActivityReply = z.infer<typeof memoryReviewActivityReplySchema>;
