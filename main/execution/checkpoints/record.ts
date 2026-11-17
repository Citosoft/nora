import type { StoreTransaction } from "@main/types/execution/store.types";
import type { CheckpointCapture } from "@main/types/execution/checkpoints.types";
import { checkpointCaptureSchema } from "./schema";
import { ExecutionCommandError } from "../errors";

/** Evidence is tied to the exact claimed attempt and never overwritten by a later observation. */
export function recordCheckpoint(transaction: StoreTransaction, effectId: string, phase: "baseline" | "final", input: CheckpointCapture): boolean {
  const capture = checkpointCaptureSchema.parse(input);
  const effect = transaction.effect(effectId);
  if (!effect || effect.status !== "claimed" || effect.action.kind !== (phase === "baseline" ? "start" : "review")) {
    throw new ExecutionCommandError("conflict", "Checkpoint has no claimed effect");
  }
  const state = transaction.state(effect.conversationId, effect.runId);
  const run = state?.runs.find((entry) => entry.id === effect.runId && entry.attemptId === effect.attemptId);
  if (!state || !run || (phase === "baseline" && run.state !== "starting")) return false;
  if (phase === "final" && (!["completed", "failed", "interrupted"].includes(run.state) || run.review !== "pending")) return false;
  const existing = transaction.checkpoint(effect.conversationId, effect.runId);
  if (existing && existing.attemptId !== effect.attemptId) throw new ExecutionCommandError("conflict", "Checkpoint belongs to another attempt");
  if (phase === "baseline") {
    if (existing) throw new ExecutionCommandError("conflict", "Baseline checkpoint already exists");
    transaction.putCheckpoint({ conversationId: effect.conversationId, runId: effect.runId, attemptId: effect.attemptId,
      workspace: state.conversation.workspace, continuity: "intact", baseline: capture, final: null });
  } else {
    if (!existing || existing.final) throw new ExecutionCommandError("conflict", "Final checkpoint cannot replace existing evidence");
    if (existing.continuity !== "intact") return false;
    transaction.putCheckpoint({ ...existing, final: capture });
  }
  return true;
}
