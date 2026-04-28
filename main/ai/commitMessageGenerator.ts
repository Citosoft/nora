import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type {
  AiProvider,
  AiSettings,
  AppSettings,
  ChangeEntry,
  GenerateCommitMessageResult
} from "@shared/appTypes";
import { generateText } from "ai";

const PROVIDER_PRIORITY: AiProvider[] = ["openai", "google", "anthropic"];

const PROVIDER_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  google: "gemini-2.5-flash",
  anthropic: "claude-3-5-haiku-latest"
};
const GOOGLE_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-latest"] as const;

const MAX_DIFF_CONTEXT_CHARS = 18_000;
const MAX_DIFF_CHARS_PER_FILE = 6_000;

export async function generateCommitMessageFromChanges(
  appSettings: AppSettings,
  selectedChanges: ChangeEntry[]
): Promise<GenerateCommitMessageResult> {
  if (selectedChanges.length === 0) {
    throw new Error("No selected changes are available for commit message generation.");
  }

  const provider = resolveProvider(appSettings.ai);
  if (!provider) {
    throw new Error("Add at least one AI provider API key in Settings to generate commit messages.");
  }

  const prompt = buildCommitMessagePrompt(selectedChanges);
  const selectedModel = resolveProviderModel(appSettings.ai, provider);
  const responseText = provider === "google"
    ? await generateWithGoogleFallbacks(appSettings.ai.apiKeys.google, selectedModel, prompt)
    : await generateWithModel(createProviderModel(provider, appSettings.ai.apiKeys[provider], selectedModel), prompt);
  const message = normalizeCommitMessage(responseText);

  if (!message) {
    throw new Error("The AI response did not include a valid commit message.");
  }

  return {
    message,
    provider
  };
}

async function generateWithGoogleFallbacks(apiKey: string, selectedModel: string, prompt: string): Promise<string> {
  let lastError: unknown = null;
  const modelCandidates = dedupeModels([selectedModel, ...GOOGLE_MODEL_FALLBACKS]);

  for (const modelId of modelCandidates) {
    try {
      const model = createGoogleGenerativeAI({ apiKey: apiKey.trim() })(modelId);
      return await generateWithModel(model, prompt);
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

async function generateWithModel(model: Parameters<typeof generateText>[0]["model"], prompt: string): Promise<string> {
  const response = await generateText({
    model,
    system: "You write concise, high-quality git commit messages. Return only the commit subject line.",
    prompt,
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
    throw new Error(`Missing ${provider} API key for commit message generation.`);
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

function buildCommitMessagePrompt(changes: ChangeEntry[]): string {
  const diffContext = createDiffContext(changes);
  const changedFileList = changes.map((change) => `- ${change.path} (${change.status})`).join("\n");

  return [
    "Generate a single git commit subject line for these staged changes.",
    "Requirements:",
    "- One line only.",
    "- No quotes, no markdown, no prefix text.",
    "- Use imperative mood.",
    "- Keep it under 72 characters when possible.",
    "",
    "Changed files:",
    changedFileList,
    "",
    "Diff context:",
    diffContext
  ].join("\n");
}

function createDiffContext(changes: ChangeEntry[]): string {
  let consumed = 0;
  const chunks: string[] = [];

  for (const change of changes) {
    if (consumed >= MAX_DIFF_CONTEXT_CHARS) {
      break;
    }

    const header = `\n# ${change.path}\n`;
    const available = MAX_DIFF_CONTEXT_CHARS - consumed - header.length;
    if (available <= 0) {
      break;
    }

    const fileDiff = change.diff.slice(0, Math.min(MAX_DIFF_CHARS_PER_FILE, available));
    chunks.push(`${header}${fileDiff}`);
    consumed += header.length + fileDiff.length;
  }

  return chunks.join("\n").trim() || "No diff context available.";
}

function normalizeCommitMessage(rawText: string): string {
  const firstLine = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) {
    return "";
  }

  return firstLine
    .replace(/^commit message\s*:\s*/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
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
