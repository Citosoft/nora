import type { AiGenerationSource, AiSettings } from "@shared/appTypes";

export interface TextGenerationRequest {
  signal?: AbortSignal;
  system: string;
  user: string;
}
export interface TextGenerationResult {
  text: string;
  provider: AiGenerationSource;
}
export type RuntimeTextProvider = "codex" | "claude";
export interface TextGenerators {
  cloud(settings: AiSettings, request: TextGenerationRequest): Promise<TextGenerationResult>;
  local(model: AiSettings["localLlmModelId"], request: TextGenerationRequest): Promise<string>;
  runtime(provider: RuntimeTextProvider, request: TextGenerationRequest): Promise<string>;
}
export interface RuntimeTextInput {
  executable: string;
  cwd: string;
  environment: NodeJS.ProcessEnv;
  request: TextGenerationRequest;
}
