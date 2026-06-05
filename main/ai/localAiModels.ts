import type { LocalAiModelStatus, LocalLlmModelId } from "@shared/appTypes";
import { app } from "electron";
import fsPromises from "node:fs/promises";
import path from "node:path";

type LocalLlmModelDefinition = {
  id: LocalLlmModelId;
  fileName: string;
  downloadUrl: string;
};

const LOCAL_LLM_MODELS: Record<LocalLlmModelId, LocalLlmModelDefinition> = {
  "qwen2.5-0.5b-instruct": {
    id: "qwen2.5-0.5b-instruct",
    fileName: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
    downloadUrl:
      "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
  },
  "smollm2-360m-instruct": {
    id: "smollm2-360m-instruct",
    fileName: "smolLM2-360m-instruct-Q4_K_M.gguf",
    downloadUrl:
      "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smolLM2-360m-instruct-Q4_K_M.gguf"
  }
};

export function getLocalLlmModelPath(modelId: LocalLlmModelId): string {
  const model = LOCAL_LLM_MODELS[modelId];
  return path.join(app.getPath("userData"), "ai-models", "llm", model.fileName);
}

export async function getLocalAiModelStatus(modelId: LocalLlmModelId): Promise<LocalAiModelStatus> {
  const filePath = getLocalLlmModelPath(modelId);
  try {
    const stats = await fsPromises.stat(filePath);
    return {
      modelId,
      state: stats.isFile() && stats.size > 0 ? "installed" : "not-installed",
      filePath,
      sizeBytes: stats.isFile() ? stats.size : null
    };
  } catch {
    return {
      modelId,
      state: "not-installed",
      filePath,
      sizeBytes: null
    };
  }
}

export async function installLocalAiModel(modelId: LocalLlmModelId): Promise<LocalAiModelStatus> {
  const model = LOCAL_LLM_MODELS[modelId];
  const targetPath = getLocalLlmModelPath(modelId);
  const tempPath = `${targetPath}.download`;
  await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });

  const response = await fetch(model.downloadUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Unable to download local model (${response.status}).`);
  }

  const file = await fsPromises.open(tempPath, "w");
  try {
    const reader = response.body.getReader();
    while (true) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      await file.write(Buffer.from(next.value));
    }
  } finally {
    await file.close();
  }

  const stats = await fsPromises.stat(tempPath);
  if (!stats.isFile() || stats.size === 0) {
    throw new Error("Downloaded local model was empty.");
  }

  await fsPromises.rename(tempPath, targetPath);
  return getLocalAiModelStatus(modelId);
}
