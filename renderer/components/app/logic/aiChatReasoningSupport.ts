import type { AiChatReasoningLevel } from "@/components/app/types";
import type { AiProvider } from "@shared/appTypes";

const OFF_ONLY_LEVELS: readonly AiChatReasoningLevel[] = ["off"];
const ALL_REASONING_LEVELS: readonly AiChatReasoningLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
const NO_XHIGH_LEVELS: readonly AiChatReasoningLevel[] = ["off", "minimal", "low", "medium", "high"];

function normalizeModelId(modelId: string): string {
  return modelId.trim().toLowerCase();
}

function supportsOpenAiReasoning(modelId: string): boolean {
  const normalized = normalizeModelId(modelId);
  if (!normalized) {
    return false;
  }
  return normalized.startsWith("o1") || normalized.startsWith("o3") || normalized.startsWith("o4");
}

function supportsGoogleThinking(modelId: string): boolean {
  const normalized = normalizeModelId(modelId);
  if (!normalized) {
    return false;
  }
  return normalized.includes("thinking") || normalized.includes("2.5");
}

function supportsAnthropicThinking(modelId: string): boolean {
  const normalized = normalizeModelId(modelId);
  if (!normalized) {
    return false;
  }
  return normalized.includes("thinking") || normalized.includes("3-7") || normalized.includes("-4");
}

export function getSupportedReasoningLevels(
  provider: AiProvider | null,
  modelId: string | null
): readonly AiChatReasoningLevel[] {
  const normalizedModelId = normalizeModelId(modelId ?? "");
  if (!provider || !normalizedModelId) {
    return OFF_ONLY_LEVELS;
  }

  switch (provider) {
    case "openai":
      return supportsOpenAiReasoning(normalizedModelId) ? ALL_REASONING_LEVELS : OFF_ONLY_LEVELS;
    case "google":
      return supportsGoogleThinking(normalizedModelId) ? NO_XHIGH_LEVELS : OFF_ONLY_LEVELS;
    case "anthropic":
      return supportsAnthropicThinking(normalizedModelId) ? ALL_REASONING_LEVELS : OFF_ONLY_LEVELS;
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

export function isReasoningLevelSupported(
  provider: AiProvider | null,
  modelId: string | null,
  level: AiChatReasoningLevel
): boolean {
  return getSupportedReasoningLevels(provider, modelId).includes(level);
}
