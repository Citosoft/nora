import { createHash } from "node:crypto";
import type { ConversationEngine } from "../engine";
import type { ExecutionEffect } from "@main/types/execution/store.types";
import type { CheckpointEntry, FileSnapshot, RestoreTarget, TurnCheckpoints, UndoOutcome } from "@main/types/execution/checkpoints.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { TurnReview } from "@shared/types/conversation/review.types";
import type { TurnUndoMode } from "@shared/types/conversation/turnUndo.types";
import { snapshotEntries } from "./entries";

const sha256 = (content: Buffer): string => createHash("sha256").update(content).digest("hex");

/** Pre-turn bytes for one entry: inline, kept by a checkpoint, or read back from Git; null when unavailable or not the expected bytes. */
async function beforeBytes(engine: Pick<ConversationEngine, "checkpointBlob">, checkpoints: TurnCheckpoints, workspace: WorkspaceRef,
  entry: CheckpointEntry | undefined, hash: string): Promise<Buffer | null> {
  if (!entry) return null;
  const content = "content" in entry ? Buffer.from(entry.content, "base64")
    : engine.checkpointBlob(entry.hash) ?? await checkpoints.read(workspace, entry);
  return content && sha256(content) === hash ? content : null;
}

/**
 * Keeps the pre-turn bytes of changed files that were only indexed, so undo never depends on Git keeping those objects.
 * Only changed paths are copied, which keeps the cost proportional to the turn's edits.
 */
export async function pinUndoBytes(engine: Pick<ConversationEngine, "pinCheckpointBlobs">, effect: ExecutionEffect, workspace: WorkspaceRef,
  checkpoints: TurnCheckpoints, baseline: FileSnapshot, review: TurnReview): Promise<void> {
  const entries = snapshotEntries(baseline);
  const contents: Buffer[] = [];
  for (const change of review.changes) {
    const entry = entries.get(change.path);
    if (!change.beforeHash || !entry || !("object" in entry)) continue;
    const content = await checkpoints.read(workspace, entry);
    if (content) contents.push(content);
  }
  if (contents.length) engine.pinCheckpointBlobs(effect.conversationId, effect.runId, contents);
}

/** Plans and performs an undo from the turn's saved review and baseline; the restore capability checks the disk itself. */
export async function undoExecution(engine: Pick<ConversationEngine, "item" | "checkpoint" | "checkpointBlob">, effect: ExecutionEffect, mode: TurnUndoMode, workspace: WorkspaceRef,
  checkpoints?: TurnCheckpoints): Promise<UndoOutcome> {
  if (!checkpoints) return { status: "failed", message: "Undo isn't available for this workspace.", restored: [] };
  const item = engine.item(effect.conversationId, JSON.stringify([effect.attemptId, "review"]));
  if (item?.kind !== "review" || item.result.status !== "ready" || item.result.scope !== "turn") {
    return { status: "failed", message: "This turn has no recorded file changes to undo.", restored: [] };
  }
  const stored = engine.checkpoint(effect.conversationId, effect.runId);
  if (!stored || stored.continuity !== "intact" || stored.baseline.status !== "ready") return { status: "expired" };
  const entries = snapshotEntries(stored.baseline.snapshot);
  const targets: RestoreTarget[] = await Promise.all(item.result.changes.map(async (change) => ({
    path: change.path,
    after: change.afterHash && change.afterMode ? { hash: change.afterHash, mode: change.afterMode } : null,
    before: change.beforeHash && change.beforeMode ? { hash: change.beforeHash, mode: change.beforeMode,
      content: await beforeBytes(engine, checkpoints, workspace, entries.get(change.path), change.beforeHash) } : null
  })));
  return checkpoints.restore(workspace, targets, mode);
}
