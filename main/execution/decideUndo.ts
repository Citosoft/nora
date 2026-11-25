import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { ConversationState, StoreReader } from "@main/types/execution/store.types";
import type { Decision, UndoTarget } from "@main/types/execution/decisions.types";
import { isActiveRun } from "@shared/conversations/runActivity";
import { ExecutionCommandError } from "./errors";
import { hasPendingCheckpointReview } from "./checkpoints/admission";
import { hasRunningOverlap } from "./checkpoints/record";

type UndoCommand = Extract<ConversationCommand, { kind: "undo-turn" }>;

/** Looks up what an undo-turn command needs, without hydrating snapshot contents. */
export function resolveUndoTarget(reader: StoreReader, conversationId: string, runId: string): UndoTarget | undefined {
  const state = reader.state(conversationId, runId);
  const run = state?.runs.find((entry) => entry.id === runId);
  if (!state || !run) return undefined;
  const { workspace } = state.conversation;
  return {
    review: reader.item(conversationId, JSON.stringify([run.attemptId, "review"])),
    restorable: reader.restorableCheckpoint(conversationId, runId),
    busy: hasPendingCheckpointReview(reader, workspace) || hasRunningOverlap(reader, conversationId, workspace)
  };
}

/** Accepts an undo only for a finished, reviewed turn whose snapshots remain, while nothing else writes the checkout. */
export function decideUndo(command: UndoCommand, state: ConversationState, target: UndoTarget | undefined, now: string): Decision {
  const run = state.runs.find((entry) => entry.id === command.runId);
  if (!run || run.state === "queued" || isActiveRun(run)) throw new ExecutionCommandError("invalid", "Only a finished turn can be undone");
  const review = target?.review;
  if (!target || review?.kind !== "review" || review.result.status !== "ready" || review.result.scope !== "turn" || !review.result.changes.length) {
    throw new ExecutionCommandError("invalid", "This turn has no recorded file changes to undo");
  }
  if (review.undo?.status === "pending") return { events: [], effects: [] };
  if (review.undo?.status === "undone") throw new ExecutionCommandError("conflict", "This turn was already undone");
  if (review.undo?.status === "expired" || !target.restorable) throw new ExecutionCommandError("conflict", "This turn's snapshots are no longer kept, so it can't be undone");
  if (state.conversation.workspace.access !== "write") throw new ExecutionCommandError("conflict", "This thread has read-only access to its workspace");
  if (state.runs.some(isActiveRun)) throw new ExecutionCommandError("conflict", "Wait for the current turn to finish before undoing");
  if (target.busy) throw new ExecutionCommandError("conflict", "Another turn is working in this checkout. Wait for it to finish before undoing");
  return {
    events: [{ kind: "item", item: { ...review, undo: { status: "pending", mode: command.mode, requestedAt: now } } }],
    effects: [{ id: JSON.stringify([run.attemptId, "undo", command.commandId]), conversationId: command.conversationId, runId: run.id,
      attemptId: run.attemptId, status: "pending", action: { kind: "undo", mode: command.mode } }]
  };
}
