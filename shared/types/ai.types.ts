import type { LocalLlmModelId } from "./localAi.types";

export type { LocalAiModelStatus, LocalAiRuntimeStatus, LocalLlmModelId } from "./localAi.types";

export type AiSimpleTaskProvider = "cloud" | "local" | "codex" | "claude";

export type AiProvider = "openai" | "google" | "anthropic";

export type AiGenerationSource = AiProvider | "local" | "codex" | "claude";

export interface AiApiKeys {
  openai: string;
  google: string;
  anthropic: string;
}

export interface AiSettings {
  preferredProvider: AiProvider;
  apiKeys: AiApiKeys;
  modelByProvider: Record<AiProvider, string>;
  simpleTaskProvider: AiSimpleTaskProvider;
  localLlmModelId: LocalLlmModelId;
}

export interface GenerateCommitMessagePayload {
  paths?: string[];
}

export interface GenerateCommitMessageResult {
  message: string;
  provider: AiGenerationSource;
}

export interface ListAiModelsPayload {
  provider: AiProvider;
  apiKey: string;
}

/** One model returned from a provider catalog; `releasedAtMs` when the API exposes it. */
export interface AiModelCatalogEntry {
  id: string;
  releasedAtMs?: number;
}

export interface ListAiModelsResult {
  provider: AiProvider;
  models: AiModelCatalogEntry[];
}
