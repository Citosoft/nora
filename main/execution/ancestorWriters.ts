import type { ConversationHeader } from "@shared/types/conversation/queries.types";

const CHAIN_LIMIT = 32;

/** Parent ids from nearest ancestor to root; a child may write while only these are the other active writers on its checkout. */
export function ancestorConversationIds(header: (id: string) => ConversationHeader | null, conversationId: string): Set<string> {
  const ancestors = new Set<string>();
  let current = header(conversationId)?.conversation.parentId ?? null;
  while (current && !ancestors.has(current) && ancestors.size < CHAIN_LIMIT) {
    ancestors.add(current);
    current = header(current)?.conversation.parentId ?? null;
  }
  return ancestors;
}

/** True when every other writer is an ancestor of this conversation (for example a parent blocked on ask_bot). */
export function onlyAncestorWriters(header: (id: string) => ConversationHeader | null, conversationId: string, otherWriters: readonly string[]): boolean {
  if (!otherWriters.length) return true;
  const ancestors = ancestorConversationIds(header, conversationId);
  return otherWriters.every((id) => ancestors.has(id));
}
