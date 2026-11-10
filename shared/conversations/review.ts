import { z } from "zod";
import { checkpointUnavailableSchema, turnReviewSchema } from "./checkpoints";

/** Workspace observations are never evidence of turn-specific authorship or validation. */
export const workspaceReviewSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ready"), scope: z.literal("workspace"),
    paths: z.array(z.string().min(1).max(32_768)).max(10_000), attributionUnavailable: checkpointUnavailableSchema.optional() }).strict(),
  z.object({ status: z.literal("unavailable"),
    reason: z.enum(["unsupported", "workspace-unavailable", "interrupted"]) }).strict()
]);

export const conversationReviewSchema = z.union([workspaceReviewSchema, turnReviewSchema]);
