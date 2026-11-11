import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { AiProvider, AiSettings } from "@shared/appTypes";
import type { TextGenerationRequest, TextGenerationResult } from "@main/types/ai/textGeneration.types";

const PROVIDER_PRIORITY: AiProvider[] = ["openai", "google", "anthropic"];

const PROVIDER_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash",
  anthropic: "claude-3-5-haiku-latest"
};
const GOOGLE_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"] as const;

export async function generateCloudText(settings: AiSettings, request: TextGenerationRequest): Promise<TextGenerationResult> {
  const provider = resolveProvider(settings);
  if (!provider) throw new Error("Add an AI provider API key in Settings → AI, or select a provider runtime or local model.");
  const model = resolveProviderModel(settings, provider);
  const text = provider === "google"
    ? await generateWithGoogleFallbacks(settings.apiKeys.google, model, request)
    : await generateWithModel(createProviderModel(provider, settings.apiKeys[provider], model), request);
  return { text, provider };
}

async function generateWithGoogleFallbacks(apiKey: string, selectedModel: string, request: TextGenerationRequest): Promise<string> {
  let lastError: unknown = null;
  const modelCandidates = dedupeModels([selectedModel, ...GOOGLE_MODEL_FALLBACKS]);

  for (const modelId of modelCandidates) {
    try {
      const model = createGoogleGenerativeAI({ apiKey: apiKey.trim() })(modelId);
      return await generateWithModel(model, request);
    } catch (error: unknown) {
      lastError = error;
      if (!isGoogleModelNotFoundError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No compatible Gemini model is available for this Google API key.");
}

async function generateWithModel(model: Parameters<typeof generateText>[0]["model"], request: TextGenerationRequest): Promise<string> {
  const response = await generateText({
    model,
    system: request.system,
    prompt: request.user,
    abortSignal: AbortSignal.any([AbortSignal.timeout(90_000), ...(request.signal ? [request.signal] : [])]),
    temperature: 0.2
  });
  return response.text;
}

function resolveProvider(settings: AiSettings): AiProvider | null {
  const configuredProviders = PROVIDER_PRIORITY.filter((provider) => settings.apiKeys[provider].trim().length > 0);
  if (configuredProviders.length === 0) {
    return null;
  }
  if (configuredProviders.includes(settings.preferredProvider)) {
    return settings.preferredProvider;
  }
  return configuredProviders[0];
}

function createProviderModel(provider: AiProvider, apiKey: string, modelId: string) {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error(`Missing ${provider} API key for text generation.`);
  }

  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey: trimmedApiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey: trimmedApiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey: trimmedApiKey })(modelId);
  }
}

function resolveProviderModel(settings: AiSettings, provider: AiProvider): string {
  const selected = settings.modelByProvider[provider]?.trim();
  return selected || PROVIDER_MODELS[provider];
}

function isGoogleModelNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("is not found for api version") || message.includes("call listmodels");
}

function dedupeModels(models: readonly string[]): string[] {
  return Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
}
