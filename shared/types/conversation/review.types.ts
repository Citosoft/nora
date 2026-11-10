import type { z } from "zod";
import type { conversationReviewSchema, workspaceReviewSchema } from "@shared/conversations/review";
import type { checkpointUnavailableSchema, turnReviewSchema } from "@shared/conversations/checkpoints";

export type WorkspaceReview = z.infer<typeof workspaceReviewSchema>;
export type ConversationReview = z.infer<typeof conversationReviewSchema>;
export type TurnReview = z.infer<typeof turnReviewSchema>;
export type TurnChange = TurnReview["changes"][number];
export type CheckpointUnavailableReason = z.infer<typeof checkpointUnavailableSchema>;
