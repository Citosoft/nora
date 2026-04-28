import type { AiChatTabState } from "@/components/app/types";

export function createAiChatTab(projectId: string): AiChatTabState {
  const id = globalThis.crypto?.randomUUID?.() ?? `ai-chat-tab-${Date.now()}`;
  return {
    id,
    projectId,
    title: "AI Chat",
    messages: [],
    reasoningMode: "off"
  };
}
