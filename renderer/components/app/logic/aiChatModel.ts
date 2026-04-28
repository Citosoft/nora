import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { AiProvider, AiSettings } from "@shared/appTypes";
import type { LanguageModel } from "ai";

const PROVIDER_PRIORITY: AiProvider[] = ["openai", "google", "anthropic"];

export const DEFAULT_AI_CHAT_MODEL_BY_PROVIDER: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash",
  anthropic: "claude-3-5-haiku-latest"
};

export function resolveAiChatProvider(settings: AiSettings): AiProvider | null {
  const configuredProviders = PROVIDER_PRIORITY.filter((provider) => settings.apiKeys[provider].trim().length > 0);
  if (configuredProviders.length === 0) {
    return null;
  }
  return configuredProviders.includes(settings.preferredProvider) ? settings.preferredProvider : configuredProviders[0];
}

export function createAiChatModel(settings: AiSettings): LanguageModel | null {
  const provider = resolveAiChatProvider(settings);
  if (!provider) {
    return null;
  }

  const apiKey = settings.apiKeys[provider].trim();
  if (!apiKey) {
    return null;
  }

  const selectedModel = settings.modelByProvider[provider]?.trim() || DEFAULT_AI_CHAT_MODEL_BY_PROVIDER[provider];
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(selectedModel);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(selectedModel);
    case "anthropic":
      return createAnthropic({ apiKey })(selectedModel);
  }
}
