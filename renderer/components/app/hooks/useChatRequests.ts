import { useCallback } from "react";
import { useWaitingRequests } from "./useWaitingRequests";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { AttentionToastsState } from "@/components/app/types/attentionToasts.types";

/** Approvals and questions waiting in a chat's work threads, shown inline in the chat. */
export function useChatRequests(chatId: string | null): AttentionToastsState {
  const include = useCallback(({ conversation }: ConversationSummary) => !!chatId && conversation.parentId === chatId, [chatId]);
  return useWaitingRequests(include);
}
