import type { AiChatMode, AiChatReasoningLevel } from "@/components/app/types";
import type { AiProvider } from "@shared/appTypes";

export const AI_CHAT_PANEL_PROVIDERS: AiProvider[] = ["openai", "google", "anthropic"];

export const AI_CHAT_PANEL_PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic"
};

export const AI_CHAT_PANEL_REASONING_LEVEL_MENU: {
  value: AiChatReasoningLevel;
  shortLabel: string;
  label: string;
  description: string;
}[] = [
  { value: "off", shortLabel: "Off", label: "Off", description: "Default model behavior; no extra reasoning budget." },
  {
    value: "minimal",
    shortLabel: "Min",
    label: "Minimal",
    description: "Lightest extended reasoning (OpenAI: minimal effort; Gemini: minimal; Anthropic: small thinking budget)."
  },
  {
    value: "low",
    shortLabel: "Low",
    label: "Low",
    description: "Low reasoning depth across providers."
  },
  {
    value: "medium",
    shortLabel: "Med",
    label: "Medium",
    description: "Balanced reasoning (good default when your model supports thinking)."
  },
  {
    value: "high",
    shortLabel: "High",
    label: "High",
    description: "Deeper reasoning; higher latency and token use."
  },
  {
    value: "xhigh",
    shortLabel: "Max",
    label: "Maximum",
    description: "Strongest setting we map (OpenAI: xhigh; Anthropic: largest budget; Gemini: high)."
  }
];

export const AI_CHAT_PANEL_MODE_MENU: {
  value: AiChatMode;
  label: string;
  shortLabel: string;
  disabled: boolean;
  description: string;
}[] = [
  {
    value: "ask",
    label: "Ask",
    shortLabel: "Ask",
    disabled: false,
    description: "Read-only workspace chat."
  },
  {
    value: "agent",
    label: "Agent",
    shortLabel: "Agent",
    disabled: true,
    description: "Coming soon"
  },
  {
    value: "plan",
    label: "Plan",
    shortLabel: "Plan",
    disabled: false,
    description: "Plan requirements and write specs."
  }
];
