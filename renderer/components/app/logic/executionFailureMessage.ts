import type { ExecutionFailure } from "@shared/types/conversation/contracts.types";

export function executionFailureMessage(failure: ExecutionFailure, now = new Date()): string {
  if (failure.code !== "usage-limit") return failure.message;
  if (!failure.resetsAt) return `${failure.message}. Reset time unavailable.`;
  const reset = new Date(failure.resetsAt);
  if (Number.isNaN(reset.getTime())) return `${failure.message}. Reset time unavailable.`;
  if (reset <= now) return `${failure.message}. The reported reset time has passed; you can try again.`;
  const label = reset.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return `${failure.message}. Resets ${label}.`;
}
