import type { ConversationEngine } from "../engine";
import type { ExecutionEffect } from "@main/types/execution/store.types";
import type { WorkspaceReviewer } from "@main/types/execution/review.types";
import type { TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationReview, CheckpointUnavailableReason, TurnReview } from "@shared/types/conversation/review.types";
import { workspaceReviewSchema } from "@shared/conversations/review";
import { turnReviewSchema } from "@shared/conversations/checkpoints";
import { safeCapture } from "./safeCapture";
import { pinUndoBytes } from "./undo";

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
      let review: TurnReview;
      try { review = turnReviewSchema.parse(await checkpoints.compare(workspace, stored.baseline.snapshot, final.snapshot)); }
      catch { return { status: "unavailable", reason: "workspace-unavailable" }; }
      // Undo falls back to Git for anything not kept, so a pinning failure must not cost the turn its review.
      try { await pinUndoBytes(engine, effect, workspace, checkpoints, stored.baseline.snapshot, review); } catch { /* best effort */ }
      return review;
    }
    reason = final.reason;
  } else if (stored?.baseline.status === "unavailable") reason = stored.baseline.reason;
  try {
    const result = workspaceReviewSchema.parse(await reviewer(workspace));
    return result.status === "ready" && reason ? { ...result, attributionUnavailable: reason } : result;
  } catch { return { status: "unavailable", reason: "workspace-unavailable" }; }
}
