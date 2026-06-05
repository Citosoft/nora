export type LocalLlmModelId = "qwen2.5-0.5b-instruct" | "smollm2-360m-instruct";

export type AiSimpleTaskProvider = "cloud" | "local";

export type LocalAiModelInstallState = "not-installed" | "installed";

export interface LocalAiModelStatus {
  modelId: LocalLlmModelId;
  state: LocalAiModelInstallState;
  filePath: string;
  sizeBytes: number | null;
}

export interface LocalAiRuntimeStatus {
  state: LocalAiModelInstallState;
  executablePath: string | null;
  checkedPaths: string[];
}
