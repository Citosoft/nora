import type { CheckpointUnavailableReason } from "@shared/types/conversation/review.types";

export class CheckpointError extends Error {
  constructor(readonly reason: CheckpointUnavailableReason) { super("Checkpoint capture unavailable"); }
}
