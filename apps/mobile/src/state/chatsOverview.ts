import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { ChatsOverview } from "@/types/conversationState.types";
import { deriveExecutionState } from "./executionState";

/** Counts for the Inbox and Activity shortcuts above the chat list, derived from the summaries already loaded. */
export function chatsOverview(summaries: readonly ConversationSummary[]): ChatsOverview {
  let pendingRequests = 0;
  let working = 0;
  for (const summary of summaries) {
    pendingRequests += summary.pendingRequestCount;
    if (deriveExecutionState(summary).kind === "working") working += 1;
  }
  return { pendingRequests, working };
}
