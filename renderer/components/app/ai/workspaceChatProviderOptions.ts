import type { AiChatReasoningLevel } from "@/components/app/types";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { AiProvider } from "@shared/appTypes";

type OpenAiReasoningEffort = "minimal" | "low" | "medium" | "high" | "xhigh";

function openAiReasoningEffort(level: AiChatReasoningLevel): OpenAiReasoningEffort | null {
  if (level === "off") {
    return null;
  }
  return level;
}

function anthropicThinkingBudgetTokens(level: AiChatReasoningLevel): number {
  switch (level) {
    case "minimal":
      return 2048;
    case "low":
      return 4096;
    case "medium":
      return 10_000;
    case "high":
      return 20_000;
    case "xhigh":
      return 32_000;
    default:
      return 0;
  }
}

function googleThinkingLevel(level: Exclude<AiChatReasoningLevel, "off">): "minimal" | "low" | "medium" | "high" {
  if (level === "xhigh") {
    return "high";
  }
  return level;
}

/**
 * Maps workspace chat reasoning level to provider-specific request options.
 * Unsupported combinations may fail at the API; choose a lower level or Off.
 */
export function buildWorkspaceChatProviderOptions(
  provider: AiProvider,
  level: AiChatReasoningLevel
): ProviderOptions | undefined {
  if (level === "off") {
    return undefined;
  }

  switch (provider) {
    case "openai": {
      const reasoningEffort = openAiReasoningEffort(level);
      if (!reasoningEffort) {
        return undefined;
      }
      return { openai: { reasoningEffort } };
    }
    case "anthropic": {
      const budgetTokens = anthropicThinkingBudgetTokens(level);
      if (budgetTokens <= 0) {
        return undefined;
      }
      return {
        anthropic: {
          thinking: { type: "enabled", budgetTokens },
          sendReasoning: true
        }
      };
    }
    case "google":
      return { google: { thinkingConfig: { thinkingLevel: googleThinkingLevel(level) } } };
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}
