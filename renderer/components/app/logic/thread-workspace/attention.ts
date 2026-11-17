import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { WaitingThread } from "@/components/app/types/thread-workspace/ports.types";

/**
 * For each thread, the nearest descendant (an asked bot's thread or a group member's) that is waiting for an approval or answer.
 * Lets the visible parent row say so even when the waiting child is hidden from the sidebar.
 */
export function waitingDescendants(summaries: readonly ConversationSummary[]): Map<string, WaitingThread> {
  const children = new Map<string, ConversationSummary[]>();
  for (const summary of summaries) {
    const parent = summary.conversation.parentId;
    if (parent && !summary.conversation.archivedAt) children.set(parent, [...(children.get(parent) ?? []), summary]);
  }
  const result = new Map<string, WaitingThread>();
  const find = (conversationId: string, seen: Set<string>): WaitingThread | null => {
    for (const child of children.get(conversationId) ?? []) {
      const id = child.conversation.id;
      if (seen.has(id)) continue;
      seen.add(id);
      if (child.pendingRequestCount > 0) return { conversationId: id, name: child.conversation.bot?.name ?? child.conversation.title };
      const deeper = find(id, seen);
      if (deeper) return deeper;
    }
    return null;
  };
  for (const parent of children.keys()) {
    const waiting = find(parent, new Set([parent]));
    if (waiting) result.set(parent, waiting);
  }
  return result;
}
