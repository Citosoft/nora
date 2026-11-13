import type { Conversation } from "@shared/types/conversation/contracts.types";

/** Standing guidance a provider receives for a conversation: the bot's when bound to one, otherwise the user's role. */
export function conversationGuidance(conversation: Pick<Conversation, "bot" | "role">): string | undefined {
  return conversation.bot?.guidance ?? conversation.role?.guidance;
}
