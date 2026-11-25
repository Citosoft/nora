import type { z } from "zod";
import type { checkpointCaptureSchema, checkpointManifestSchema, fileSnapshotSchema, manifestCaptureSchema, storedCheckpointSchema } from "@main/execution/checkpoints/schema";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { TurnReview } from "@shared/types/conversation/review.types";
import type { TurnUndoMode, TurnUndoState } from "@shared/types/conversation/turnUndo.types";
import type { fileModeSchema } from "@shared/conversations/checkpoints";

export type FileSnapshot = z.infer<typeof fileSnapshotSchema>;
export type CheckpointFile = FileSnapshot["files"][number];
export type CheckpointOmission = NonNullable<FileSnapshot["omitted"]>[number];
export type CheckpointIndexedFile = NonNullable<FileSnapshot["indexed"]>[number];
export type CheckpointEntry = CheckpointFile | CheckpointOmission | CheckpointIndexedFile;
export type CheckpointCapture = z.infer<typeof checkpointCaptureSchema>;
export type StoredCheckpoint = z.infer<typeof storedCheckpointSchema>;
export type ManifestCapture = z.infer<typeof manifestCaptureSchema>;
export type CheckpointManifest = z.infer<typeof checkpointManifestSchema>;
export interface CheckpointRun { runId: string; attemptId: string; /** Unfinished review or undo work still needs this checkpoint. */ active: boolean }
export type CheckpointFileMode = z.infer<typeof fileModeSchema>;
/** One file's expected state on disk: the bytes' SHA-256 and mode. */
export interface RestoreFileState { hash: string; mode: CheckpointFileMode }
/** One file an undo puts back. */
export interface RestoreTarget {
  path: string;
  /** What the turn left; null when the turn deleted the file. */
  after: RestoreFileState | null;
  /** What to put back; null when the turn added the file. `content` is null when only a fingerprint was kept. */
  before: (RestoreFileState & { content: Buffer | null }) | null;
}
/** A finished undo, before the host stamps its completion time. */
type FinishedUndo = Extract<TurnUndoState, { status: "undone" | "blocked" | "failed" }>;
type WithoutTime<State> = State extends unknown ? Omit<State, "at"> : never;
export type RestoreOutcome = WithoutTime<FinishedUndo>;
/** What an undo effect reports: a restore outcome, or that the turn's snapshots are gone. */
export type UndoOutcome = RestoreOutcome | { status: "expired" };
export interface TurnCheckpoints {
  capture(workspace: WorkspaceRef): Promise<CheckpointCapture>;
  /** `workspace` supplies the object database that holds indexed files' bytes. */
  compare(workspace: WorkspaceRef, baseline: FileSnapshot, final: FileSnapshot): Promise<TurnReview>;
  /** A snapshot entry's verified bytes, or null when only its fingerprint was kept or its Git object is gone. */
  read(workspace: WorkspaceRef, entry: CheckpointEntry): Promise<Buffer | null>;
  /** Puts turn files back, checking each one still holds what the turn left before writing anything. */
  restore(workspace: WorkspaceRef, targets: readonly RestoreTarget[], mode: TurnUndoMode): Promise<RestoreOutcome>;
}
