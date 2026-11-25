import type { ConversationRun } from "@shared/types/conversation/contracts.types";

export const activeRunStates = ["starting", "running", "awaiting-approval", "awaiting-input", "stopping", "recovering"] as const;

/** A run that holds the conversation: it has started and has not reached a terminal state. */
export function isActiveRun(run: Pick<ConversationRun, "state">): boolean {
  return activeRunStates.some((state) => state === run.state);
}
