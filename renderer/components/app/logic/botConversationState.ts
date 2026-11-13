import type { ConversationHeader } from "@shared/types/conversation/queries.types";
import type { ExecutionFailure, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { BotAvatarState } from "@/components/app/types/botAvatar.types";

/** What an open bot thread's avatar shows: replying while assistant text streams, otherwise its run state. */
export function botConversationState(header: ConversationHeader, items: readonly TimelineItem[], failure: ExecutionFailure | null): BotAvatarState {
  if (header.conversation.archivedAt) return "settled";
  if (header.pendingRequests.length) return "waiting";
  const active = header.activeRuns[0];
  if (active) {
    const last = items.at(-1);
    return last?.kind === "message" && last.role === "assistant" && !last.complete && last.runId === active.id ? "speaking" : "thinking";
  }
  return failure ? "failed" : "idle";
}
