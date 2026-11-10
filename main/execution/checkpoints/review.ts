import type { ConversationEngine } from "../engine";
import type { ExecutionEffect } from "@main/types/execution/store.types";
import type { WorkspaceReviewer } from "@main/types/execution/review.types";
import type { TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationReview, CheckpointUnavailableReason } from "@shared/types/conversation/review.types";
import { workspaceReviewSchema } from "@shared/conversations/review";
import { turnReviewSchema } from "@shared/conversations/checkpoints";
import { safeCapture } from "./safeCapture";

export async function reviewExecution(engine: ConversationEngine, effect: ExecutionEffect, workspace: WorkspaceRef,
  reviewer: WorkspaceReviewer, checkpoints?: TurnCheckpoints): Promise<ConversationReview> {
  const stored = engine.checkpoint(effect.conversationId, effect.runId);
  let reason: CheckpointUnavailableReason | undefined;
  if (stored?.continuity === "interrupted") reason = "interrupted";
  else if (stored?.baseline.status === "ready") {
    if (!checkpoints) return { status: "unavailable", reason: "unsupported" };
    const final = stored.final ?? await safeCapture(checkpoints, workspace);
    if (!stored.final && !engine.recordCheckpoint(effect.id, "final", final)) return { status: "unavailable", reason: "interrupted" };
    if (final.status === "ready") {
      try { return turnReviewSchema.parse(await checkpoints.compare(stored.baseline.snapshot, final.snapshot)); }
      catch { return { status: "unavailable", reason: "workspace-unavailable" }; }
    }
    reason = final.reason;
  } else if (stored?.baseline.status === "unavailable") reason = stored.baseline.reason;
  try {
    const result = workspaceReviewSchema.parse(await reviewer(workspace));
    return result.status === "ready" && reason ? { ...result, attributionUnavailable: reason } : result;
  } catch { return { status: "unavailable", reason: "workspace-unavailable" }; }
}
