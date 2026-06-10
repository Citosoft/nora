import type { LoopRunStatus } from "./types/loop.types";

export function isLoopRunDeletable(status: LoopRunStatus): boolean {
  return status === "paused" || status === "completed" || status === "cancelled";
}
