import { buildChatTimeline } from "./chatTimeline";
import type { BotAuthor } from "@shared/types/bots/bots.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ChatEntry } from "@/components/app/types/chatPanels.types";

type MessageItem = Extract<TimelineItem, { kind: "message" }>;

/**
 * A work thread read as a chat with its bot: what the user said (instructions that carry their own words) and the bot's
 * latest message in each turn. Prompts a coordinator or another bot wrote, tool activity and interim notes stay in the thread.
 */
export function buildBranchTimeline(items: readonly TimelineItem[], author: BotAuthor): ChatEntry[] {
  const latestReply = new Map<string, string>();
  for (const item of items) if (item.kind === "message" && item.role === "assistant" && item.text.trim()) latestReply.set(item.runId, item.id);
  const said = items.flatMap((item): MessageItem[] => {
    if (item.kind !== "message") return [];
    if (item.role === "user") return item.chatText ? [{ ...item, text: item.chatText }] : [];
    return latestReply.get(item.runId) === item.id ? [{ ...item, author: item.author ?? author, workThreadId: undefined }] : [];
  });
  return buildChatTimeline(said);
}
