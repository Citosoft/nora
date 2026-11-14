import type { LocalLlmModelId } from "./localAi.types";

export type { LocalAiModelStatus, LocalAiRuntimeStatus, LocalLlmModelId } from "./localAi.types";

export type AiSimpleTaskProvider = "cloud" | "local" | "codex" | "claude";
/** The simple-task sources that run through an installed, signed-in runtime. */
export type AiRuntimeTaskProvider = Extract<AiSimpleTaskProvider, "codex" | "claude">;

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
  /** The model each runtime uses for simple tasks; null keeps the runtime's own default. */
  runtimeModelByProvider: Record<AiRuntimeTaskProvider, string | null>;
  /** Background memory reviews have their own source and model, separate from simple tasks. */
  memoryReview: AiMemoryReviewSettings;
}

/** Sources that can hold a memory review: on-device models are too small for its prompt, so they are not offered. */
export type AiMemoryReviewProvider = Exclude<AiSimpleTaskProvider, "local">;
export interface AiMemoryReviewSettings {
  provider: AiMemoryReviewProvider;
  /** For a runtime source, its model; null keeps the runtime's own default. Cloud uses the API key and model settings. */
  runtimeModel: string | null;
}

/** The settings that choose how Nora's background AI tasks are generated: simple tasks and memory reviews. */
export type AiSimpleTaskSettings = Pick<AiSettings, "simpleTaskProvider" | "localLlmModelId" | "runtimeModelByProvider" | "memoryReview">;

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
