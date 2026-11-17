import { chatMessages, chatTranscript } from "./transcript";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";

/**
 * The first instruction of a side chat. A branch from a message carries the chat up to that message, so the bot knows what
 * is being followed up; a blank branch carries nothing. Later messages in the branch go to the bot as the user wrote them.
 */
export function branchPrompt(botName: string, chat: readonly TimelineItem[], fromItemId: string | null, text: string): string {
  const index = fromItemId ? chat.findIndex((item) => item.id === fromItemId) : -1;
  if (fromItemId && index < 0) throw new Error("The message this branch starts from is no longer in the chat.");
  const opening = `You are ${botName}, in a side chat the user started apart from your main chat with them. Keep replies concise and conversational.`;
  const seed = index < 0 ? "" : `\n\nThe main chat up to where they branched off:\n\n${chatTranscript(chatMessages(chat.slice(0, index + 1)), -1)}`;
  return `${opening}${seed}\n\nTheir first message here:\n\n${text}`;
}
