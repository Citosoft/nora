import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ThreadToolScope } from "@main/types/execution/toolScope.types";
import { isBotOrChatThread } from "@shared/conversations/accountExtras";

/** Read access always wins, so a review stays a review; an app's builder thread then gets only app tools and its connectors. */
export function threadToolScope(conversation: Pick<Conversation, "workspace" | "source">): ThreadToolScope {
  if (conversation.workspace.access === "read") return conversation.source?.kind === "worker" ? "read-worker" : "inspect";
  if (conversation.source?.kind === "app") return "apps";
  return "full";
}

export function isReadOnlyToolScope(scope: ThreadToolScope): boolean {
  return scope === "inspect" || scope === "read-worker";
}

/**
 * Whether a thread loads what the runtime's signed-in account adds to every session. Only a user's own working thread does:
 * bot threads and chats skip it (see isBotOrChatThread) and a scoped thread reaches only its run's servers, so neither
 * carries an account-wide tool catalogue that can add tens of thousands of tokens to every turn.
 */
export function threadLoadsAccountExtras(conversation: Pick<Conversation, "workspace" | "source" | "bot" | "group" | "direct" | "chatBranch">): boolean {
  return threadToolScope(conversation) === "full" && !isBotOrChatThread(conversation);
}
