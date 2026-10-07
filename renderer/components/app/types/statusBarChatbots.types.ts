import type { ChatbotShortcut } from "@/components/app/types/chatbot.types";

/** Footer chatbot shortcuts; only available inside the signed-in shell where the workspace browser exists. */
export type StatusBarChatbotsModel = {
  shortcuts: ChatbotShortcut[];
  /** False when no project is focused, since shortcuts open in that project's internal browser. */
  canOpen: boolean;
  openShortcut: (shortcut: ChatbotShortcut) => void;
};
