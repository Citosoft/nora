export type AiProvider = "openai" | "google" | "anthropic";

export interface AiApiKeys {
  openai: string;
  google: string;
  anthropic: string;
}

export interface AiSettings {
  preferredProvider: AiProvider;
  apiKeys: AiApiKeys;
  modelByProvider: Record<AiProvider, string>;
}

export interface GenerateCommitMessagePayload {
  paths?: string[];
}

export interface GenerateCommitMessageResult {
  message: string;
  provider: AiProvider;
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
