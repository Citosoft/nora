import type { ConversationRun, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { StoreReader, StoreTransaction, ExecutionEffect } from "@main/types/execution/store.types";
import type { CheckpointCapture } from "@main/types/execution/checkpoints.types";
import { checkpointCaptureSchema } from "./schema";
import { isActiveRun } from "@shared/conversations/runActivity";
import { workspacesOverlap } from "../workspaceConflict";
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
      workspace: state.conversation.workspace,
      continuity: hasRunningOverlap(transaction, effect.conversationId, state.conversation.workspace) ? "interrupted" : "intact",
      baseline: capture, final: null });
  } else {
    if (!existing || existing.final) throw new ExecutionCommandError("conflict", "Final checkpoint cannot replace existing evidence");
    if (existing.continuity !== "intact") return false;
    transaction.putCheckpoint({ ...existing, final: capture });
  }
  return true;
}

/** Overlapping writes make the older baseline unsuitable for turn-level review. */
export function invalidateOverlappingBaselines(transaction: StoreTransaction, effect: ExecutionEffect, workspace: WorkspaceRef): void {
  if (workspace.access !== "write") return;
  for (const state of transaction.activeStates()) {
    if (state.conversation.id === effect.conversationId || !workspacesOverlap(state.conversation.workspace, workspace)) continue;
    for (const run of state.runs.filter(isActiveRun)) transaction.interruptCheckpoint(state.conversation.id, run.id);
  }
}

/** A run that may be writing files: active, unless it is still waiting to claim its start (and so has touched nothing). */
export function mayBeWriting(reader: Pick<StoreReader, "effect">, run: ConversationRun): boolean {
  return isActiveRun(run) && (run.state !== "starting" || reader.effect(JSON.stringify([run.attemptId, "start"]))?.status !== "pending");
}

/** Another conversation may be writing an overlapping checkout. */
export function hasRunningOverlap(reader: StoreReader, conversationId: string, workspace: WorkspaceRef): boolean {
  return reader.writers(workspace).some((id) => id !== conversationId && reader.state(id)?.runs.some((run) => mayBeWriting(reader, run)));
}
