import { useCallback } from "react";
import { useThreadCenterPorts } from "./useThreadCenterPorts";
import { useWaitingRequests } from "./useWaitingRequests";
import { isChat } from "@/components/app/logic/directChats";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { AttentionToastsState } from "@/components/app/types/attentionToasts.types";

/** Requests waiting anywhere except the thread on screen, which shows its own; an open chat also shows its work threads' requests itself. */
export function useAttentionToasts(): AttentionToastsState {
  const { state } = useThreadCenterPorts();
  const active = state.layout.documents.find((entry) => entry.id === state.layout.activeId);
  const viewed = active?.target.kind === "thread" ? active.target.conversationId : null;
  const viewedChat = !!viewed && state.summaries.some(({ conversation }) => conversation.id === viewed && isChat(conversation));
  const include = useCallback(({ conversation }: ConversationSummary) => conversation.id !== viewed && !(viewedChat && conversation.parentId === viewed),
    [viewed, viewedChat]);
  return useWaitingRequests(include);
}
