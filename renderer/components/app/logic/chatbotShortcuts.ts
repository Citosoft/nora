import type { ChatbotShortcut } from "@/components/app/types/chatbot.types";

export const CHATBOT_SHORTCUTS: ChatbotShortcut[] = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    url: "https://chatgpt.com/",
    hostLabel: "chatgpt.com",
    description: "Open ChatGPT in the internal browser."
  },
  {
    id: "claude",
    label: "Claude",
    url: "https://claude.ai/",
    hostLabel: "claude.ai",
    description: "Open Claude in the internal browser."
  },
  {
    id: "gemini",
    label: "Gemini",
    url: "https://gemini.google.com/",
    hostLabel: "gemini.google.com",
    description: "Open Gemini in the internal browser."
  },
  {
    id: "perplexity",
    label: "Perplexity",
    url: "https://www.perplexity.ai/",
    hostLabel: "perplexity.ai",
    description: "Open Perplexity in the internal browser."
  },
  {
    id: "grok",
    label: "Grok",
    url: "https://grok.com/",
    hostLabel: "grok.com",
    description: "Open Grok in the internal browser."
  }
];
