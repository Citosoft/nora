import type { AiChatMessage } from "@/components/app/types";

export const getAiChatMessageText = (message: AiChatMessage): string => {
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    return "";
  }

  return message.parts.flatMap((part) => {
    if (!part || typeof part !== "object" || !("type" in part)) {
      return [];
    }
    if (part.type !== "text" || !("text" in part) || typeof part.text !== "string") {
      return [];
    }
    return [part.text];
  }).join("");
};
