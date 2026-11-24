import type { Conversation } from "@shared/types/conversation/contracts.types";

/**
 * Bot threads and chats (group, direct, or a branch off one) run without what the runtime's signed-in account adds to every
 * session (for Claude: claude.ai connectors and synced plugins and skills); a bot gets back only the account connectors it names.
 */
export function isBotOrChatThread(conversation: Pick<Conversation, "bot" | "group" | "direct" | "chatBranch">): boolean {
  return !!conversation.bot || !!conversation.group || !!conversation.direct || !!conversation.chatBranch;
}
