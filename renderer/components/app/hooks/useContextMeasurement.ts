import { useEffect } from "react";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";

/**
 * Asks the host once to measure an existing thread that has no context reading (threads from before context
 * tracking, or resumed from the CLI). The reading reaches the view through the conversation event stream.
 */
export function useContextMeasurement(client: Pick<ConversationClient, "context">, conversation: Conversation | null, enabled: boolean): void {
  const conversationId = conversation?.id ?? null;
  const needsReading = enabled && !!conversation?.nativeConversationId && conversation.context === undefined;
  useEffect(() => {
    if (!needsReading || !conversationId) return;
    // Best effort: without a saved reading the donut stays empty until the next response.
    client.context(conversationId).catch(() => {});
  }, [client, conversationId, needsReading]);
}
