import type { TimelineItem } from "@shared/types/conversation/contracts.types";

const TRANSCRIPT_MAX_CHARS = 40_000;
type MessageItem = Extract<TimelineItem, { kind: "message" }>;

/**
 * Chat messages after `since` (the index of the last message the reader already has, or -1), newest last and bounded.
 * Anything cut from the oldest end stays reachable through the reader's `chat_history` tool, so the bound costs context, not information.
 */
export function chatTranscript(messages: readonly MessageItem[], since: number, maxChars = TRANSCRIPT_MAX_CHARS): string {
  const transcript = messages.slice(since + 1).map((item) => `[${item.role === "user" ? "User" : item.author?.name ?? "Nora"}]: ${item.text}`).join("\n\n");
  return transcript.length > maxChars ? `[…earlier messages omitted; call chat_history to read them]\n${transcript.slice(-maxChars)}` : transcript;
}

/** The complete, non-empty messages of a chat timeline, oldest first. */
export function chatMessages(items: readonly TimelineItem[]): MessageItem[] {
  return items.filter((item): item is MessageItem => item.kind === "message" && item.complete && !!item.text.trim());
}
