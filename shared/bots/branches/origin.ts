import type { ChatBranchOrigin, TimelineItem } from "@shared/types/conversation/contracts.types";

const EXCERPT_MAX = 600;

/** What a branch saves about the message it started from: enough to show it after the chat has moved on or been trimmed. */
export function chatBranchOrigin(message: Pick<Extract<TimelineItem, { kind: "message" }>, "id" | "role" | "text" | "createdAt" | "author">): ChatBranchOrigin {
  const text = message.text.trim();
  return { itemId: message.id, role: message.role, authorName: message.role === "user" ? null : message.author?.name ?? "Nora", createdAt: message.createdAt,
    excerpt: text.length > EXCERPT_MAX ? `${text.slice(0, EXCERPT_MAX - 1).trimEnd()}…` : text };
}
