import { z } from "zod";

export const THREAD_REFERENCE_LIMIT = 10;
export const threadReferenceSchema = z.object({
  id: z.string().min(1).max(512), conversationId: z.string().min(1).max(512),
  environmentId: z.string().min(1).max(512), title: z.string().min(1).max(200),
  indexPath: z.string().min(1).max(32768), capturedAt: z.string().datetime(), cursor: z.number().int().nonnegative()
}).strict();
