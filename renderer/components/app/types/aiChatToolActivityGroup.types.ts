import type { AiChatToolActivityEntry } from "@/components/app/types/aiChatToolActivity.types";

export type AiChatToolActivityGroupProps = {
  messageId: string;
  entries: AiChatToolActivityEntry[];
};
