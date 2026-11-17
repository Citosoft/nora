import type { AiGenerationSource, AiRuntimeTaskProvider, AiSettings } from "@shared/appTypes";

export interface TextGenerationRequest {
  signal?: AbortSignal;
  system: string;
  user: string;
}
/** Tokens one generation used, as its source reports them (input includes cached tokens); an estimate, not a bill. */
export interface TextGenerationUsage { inputTokens: number; outputTokens: number; }
export interface TextGenerationResult {
  text: string;
  provider: AiGenerationSource;
  /** The model that answered, or null when a runtime used its own default and did not say which. */
  model: string | null;
  /** Null when the source does not report usage, such as a local model. */
  usage: TextGenerationUsage | null;
}
/** What a source returns before the caller names the source: the text, the model that answered (null when unknown) and its usage. */
export interface GeneratedText { text: string; model: string | null; usage: TextGenerationUsage | null; }
export type RuntimeTextProvider = AiRuntimeTaskProvider;
export interface TextGenerators {
  cloud(settings: AiSettings, request: TextGenerationRequest): Promise<TextGenerationResult>;
  local(model: AiSettings["localLlmModelId"], request: TextGenerationRequest): Promise<string>;
  /** `model` null uses the runtime's own default model. */
  runtime(provider: RuntimeTextProvider, request: TextGenerationRequest, model: string | null): Promise<GeneratedText>;
}
export interface RuntimeTextInput {
  executable: string;
  cwd: string;
  environment: NodeJS.ProcessEnv;
  request: TextGenerationRequest;
  /** Null keeps the runtime's default model. */
  model: string | null;
}
