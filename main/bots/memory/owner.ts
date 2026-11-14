import { NORA_BOT_ID } from "@shared/bots/catalog";
import type { Conversation } from "@shared/types/conversation/contracts.types";

/** Whose notes a thread reads and writes: its bot's, or Nora's for every bot-less thread. */
export function memoryOwnerOf(conversation: Pick<Conversation, "bot">): string {
  return conversation.bot?.botId ?? NORA_BOT_ID;
}
