import type { LocalVoiceModelStatus, LocalWhisperModelId } from "@shared/appTypes";
import { app } from "electron";
import fsPromises from "node:fs/promises";
import path from "node:path";

type LocalWhisperModelDefinition = {
  id: LocalWhisperModelId;
  fileName: string;
  downloadUrl: string;
};

const LOCAL_WHISPER_MODELS: Record<LocalWhisperModelId, LocalWhisperModelDefinition> = {
  "tiny.en": {
    id: "tiny.en",
    fileName: "ggml-tiny.en.bin",
    downloadUrl: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin"
  },
  "base.en": {
    id: "base.en",
    fileName: "ggml-base.en.bin",
    downloadUrl: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"
  }
};

export function getLocalWhisperModelPath(modelId: LocalWhisperModelId): string {
  const model = LOCAL_WHISPER_MODELS[modelId];
  return path.join(app.getPath("userData"), "voice-models", "whisper", model.fileName);
}

export async function getLocalVoiceModelStatus(modelId: LocalWhisperModelId): Promise<LocalVoiceModelStatus> {
  const filePath = getLocalWhisperModelPath(modelId);
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

export async function installLocalVoiceModel(modelId: LocalWhisperModelId): Promise<LocalVoiceModelStatus> {
  const model = LOCAL_WHISPER_MODELS[modelId];
  const targetPath = getLocalWhisperModelPath(modelId);
  const tempPath = `${targetPath}.download`;
  await fsPromises.mkdir(path.dirname(targetPath), { recursive: true });

  const response = await fetch(model.downloadUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Unable to download Whisper model (${response.status}).`);
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
    throw new Error("Downloaded Whisper model was empty.");
  }

  await fsPromises.rename(tempPath, targetPath);
  return getLocalVoiceModelStatus(modelId);
}
