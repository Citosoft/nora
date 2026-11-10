import { z } from "zod";

export const checkpointUnavailableSchema = z.enum(["unsupported", "capture-failed", "limit-exceeded", "workspace-changed", "interrupted"]);
export const fileModeSchema = z.enum(["100644", "100755", "120000"]);
export const turnReviewSchema = z.object({
  status: z.literal("ready"), scope: z.literal("turn"), attribution: z.literal("observed"),
  baselineAt: z.string().datetime(), capturedAt: z.string().datetime(),
  changes: z.array(z.object({
    path: z.string().min(1).max(32_768), kind: z.enum(["added", "modified", "deleted"]),
    beforeMode: fileModeSchema.nullable(), afterMode: fileModeSchema.nullable(),
    beforeHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(), afterHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    patch: z.string().max(128 * 1024).nullable(), presentation: z.enum(["text", "binary", "too-large"])
  }).strict()).max(10_000)
}).strict();
