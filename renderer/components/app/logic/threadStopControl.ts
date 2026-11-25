import type { ConversationRun } from "@shared/types/conversation/contracts.types";

/** Stop is cooperative; while stopping or recovering, the same action force-ends the jammed turn locally. */
export function threadStopLabel(state: ConversationRun["state"]): string {
  return state === "stopping" || state === "recovering" ? "End turn" : "Stop turn";
}

export function canForceEndThread(state: ConversationRun["state"]): boolean {
  return state === "stopping" || state === "recovering";
}
