import { z } from "zod";
import { requestResponseSchema } from "@shared/conversations/contracts";

export const effectSchema = z.object({
  id: z.string().min(1), conversationId: z.string().min(1), runId: z.string().min(1),
  attemptId: z.string().min(1), status: z.enum(["pending", "claimed", "done"]),
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("start") }).strict(),
    z.object({ kind: z.literal("review") }).strict(),
    z.object({ kind: z.literal("interrupt") }).strict(),
    z.object({ kind: z.literal("steer"), queuedRunId: z.string().min(1), instruction: z.string().min(1) }).strict(),
    z.object({ kind: z.literal("respond"), requestId: z.string(), response: requestResponseSchema }).strict(),
    z.object({ kind: z.literal("reconcile") }).strict()
  ])
}).strict();
