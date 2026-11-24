import type { LocalVoiceModelSource } from "@main/types/localVoice.types";
import type { LocalVoiceModelId, LocalVoiceModelStatus } from "@shared/appTypes";
import { app } from "electron";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { downloadToFile, extractTarBz2 } from "./files";

const WHISPER_CPP_MODELS_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";
const SHERPA_ONNX_MODELS_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models";

const PARAKEET_FILES = { encoder: "encoder.int8.onnx", decoder: "decoder.int8.onnx", joiner: "joiner.int8.onnx", tokens: "tokens.txt" } as const;

function parakeetSource(archive: string): LocalVoiceModelSource {
  return {
    engine: "sherpaOnnx",
    directory: archive,
    download: { kind: "tarBz2", url: `${SHERPA_ONNX_MODELS_URL}/${archive}.tar.bz2`, requiredFiles: Object.values(PARAKEET_FILES) },
    modelType: "nemo_transducer",
    files: PARAKEET_FILES
  };
}

/** Where each catalog model comes from and how its engine loads it. Whisper files keep their original folder so existing installs carry over. */
export const LOCAL_VOICE_MODEL_SOURCES: Readonly<Record<LocalVoiceModelId, LocalVoiceModelSource>> = {
  "whisper-tiny.en": { engine: "whisperCpp", directory: "whisper", download: { kind: "file", url: `${WHISPER_CPP_MODELS_URL}/ggml-tiny.en.bin`, fileName: "ggml-tiny.en.bin" } },
  "whisper-base.en": { engine: "whisperCpp", directory: "whisper", download: { kind: "file", url: `${WHISPER_CPP_MODELS_URL}/ggml-base.en.bin`, fileName: "ggml-base.en.bin" } },
  "parakeet-tdt-0.6b-v2": parakeetSource("sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8"),
  "parakeet-tdt-0.6b-v3": parakeetSource("sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8")
};

export function getLocalVoiceModelDirectory(modelId: LocalVoiceModelId): string {
  return path.join(app.getPath("userData"), "voice-models", LOCAL_VOICE_MODEL_SOURCES[modelId].directory);
}

/** The files that make up an installed model, relative to its directory. */
function installedFiles(source: LocalVoiceModelSource): readonly string[] {
  return source.download.kind === "file" ? [source.download.fileName] : source.download.requiredFiles;
}

async function fileSize(filePath: string): Promise<number | null> {
  try {
    const stats = await fsPromises.stat(filePath);
    return stats.isFile() && stats.size > 0 ? stats.size : null;
  } catch {
    return null;
  }
}

export async function getLocalVoiceModelStatus(modelId: LocalVoiceModelId): Promise<LocalVoiceModelStatus> {
  const directory = getLocalVoiceModelDirectory(modelId);
  const sizes = await Promise.all(installedFiles(LOCAL_VOICE_MODEL_SOURCES[modelId]).map((name) => fileSize(path.join(directory, name))));
  return sizes.every((size) => size !== null)
    ? { modelId, state: "installed", sizeBytes: sizes.reduce<number>((total, size) => total + (size ?? 0), 0) }
    : { modelId, state: "not-installed", sizeBytes: null };
}

export async function downloadLocalVoiceModel(modelId: LocalVoiceModelId): Promise<LocalVoiceModelStatus> {
  const source = LOCAL_VOICE_MODEL_SOURCES[modelId];
  const directory = getLocalVoiceModelDirectory(modelId);
  if (source.download.kind === "file") {
    const targetPath = path.join(directory, source.download.fileName);
    await downloadToFile(source.download.url, `${targetPath}.download`, "voice model");
    await fsPromises.rename(`${targetPath}.download`, targetPath);
    return getLocalVoiceModelStatus(modelId);
  }

  // Unpack beside the final folder and swap it in only once every required file is present.
  const tempDirectory = await fsPromises.mkdtemp(path.join(os.tmpdir(), "nora-voice-model-"));
  const staged = `${directory}.download`;
  try {
    const archivePath = path.join(tempDirectory, "model.tar.bz2");
    await downloadToFile(source.download.url, archivePath, "voice model");
    await fsPromises.rm(staged, { recursive: true, force: true });
    await extractTarBz2(archivePath, staged);
    const missing = (await Promise.all(source.download.requiredFiles.map(async (name) => (await fileSize(path.join(staged, name))) === null ? name : null)))
      .filter((name): name is string => name !== null);
    if (missing.length) {
      throw new Error(`The downloaded voice model is missing ${missing.join(", ")}.`);
    }
    await fsPromises.rm(directory, { recursive: true, force: true });
    await fsPromises.rename(staged, directory);
  } finally {
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
    await fsPromises.rm(staged, { recursive: true, force: true });
  }
  return getLocalVoiceModelStatus(modelId);
}
