import type { Conversation } from "@shared/types/conversation/contracts.types";

/**
 * Bot threads and chats (group, direct, or a branch off one) run as delegated `agent` scopes: no signed-in account extras
 * (for Claude: claude.ai connectors and synced plugins and skills) and no user-global MCP; a bot gets back only the account
 * connectors it names.
 */
export function isBotOrChatThread(conversation: Pick<Conversation, "bot" | "group" | "direct" | "chatBranch">): boolean {
  return !!conversation.bot || !!conversation.group || !!conversation.direct || !!conversation.chatBranch;
}
