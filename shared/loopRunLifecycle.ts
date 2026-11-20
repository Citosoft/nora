import type { LoopRunStatus } from "./types/loop.types";

export function isLoopRunDeletable(status: LoopRunStatus): boolean {
  return status === "paused" || status === "completed" || status === "cancelled";
}

/** Why a run stopped when the user stopped it; any other stop reason on a paused run means it needs the user. */
export const LOOP_USER_STOP_REASONS = Object.freeze({
  paused: "Paused by user.",
  pausing: "Pause requested by user.",
  cancelled: "Cancelled by user."
});
const userStopReasons: ReadonlySet<string> = new Set(Object.values(LOOP_USER_STOP_REASONS));

export function isLoopRunStoppedByUser(stopReason: string | null): boolean {
  return stopReason !== null && userStopReasons.has(stopReason);
}
