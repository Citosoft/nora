import type { z } from "zod";
import type { checkpointCaptureSchema, checkpointManifestSchema, fileSnapshotSchema, manifestCaptureSchema, storedCheckpointSchema } from "@main/execution/checkpoints/schema";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { TurnReview } from "@shared/types/conversation/review.types";

export type FileSnapshot = z.infer<typeof fileSnapshotSchema>;
export type CheckpointFile = FileSnapshot["files"][number];
export type CheckpointCapture = z.infer<typeof checkpointCaptureSchema>;
export type StoredCheckpoint = z.infer<typeof storedCheckpointSchema>;
export type ManifestCapture = z.infer<typeof manifestCaptureSchema>;
export type CheckpointManifest = z.infer<typeof checkpointManifestSchema>;
export interface TurnCheckpoints {
  capture(workspace: WorkspaceRef): Promise<CheckpointCapture>;
  compare(baseline: FileSnapshot, final: FileSnapshot): Promise<TurnReview>;
}
