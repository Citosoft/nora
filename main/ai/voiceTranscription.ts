import type { AppSettings } from "@shared/appTypes";
import type { VoiceInputTranscriptionPayload } from "@shared/ipc/types/systemGateway.types";
import { execFile } from "node:child_process";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getLocalVoiceModelStatus, getLocalWhisperModelPath } from "./localVoiceModels";
import { getLocalWhisperExecutablePath } from "./localVoiceRuntime";

const OPENAI_TRANSCRIPTIONS_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
const LOCAL_WHISPER_SUPPORTED_EXTENSIONS = new Set([".wav", ".flac", ".mp3", ".ogg"]);
const execFileAsync = promisify(execFile);

export async function transcribeVoiceInput(appSettings: AppSettings, payload: VoiceInputTranscriptionPayload): Promise<string> {
  if (appSettings.voice.dictationProvider === "localWhisper") {
    return transcribeVoiceInputWithLocalWhisper(appSettings, payload);
  }

  const apiKey = appSettings.ai.apiKeys.openai.trim();
  if (!apiKey) {
    throw new Error("Add an OpenAI API key in Settings -> AI to use voice input transcription.");
  }

  const bytes = Uint8Array.from(payload.audioData);
  if (bytes.length === 0) {
    throw new Error("No audio was captured.");
  }

  const audioBlob = new Blob([bytes], { type: payload.mimeType || "audio/webm" });
  const form = new FormData();
  form.append("file", audioBlob, "voice-input.webm");
  form.append("model", OPENAI_TRANSCRIPTION_MODEL);

  const response = await fetch(OPENAI_TRANSCRIPTIONS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Voice transcription failed (${response.status}): ${detail || "Unknown API error"}`);
  }

  const result = await response.json() as { text?: string };
  const text = (result.text || "").trim();
  if (!text) {
    throw new Error("Voice transcription returned no text.");
  }
  return text;
}

async function transcribeVoiceInputWithLocalWhisper(
  appSettings: AppSettings,
  payload: VoiceInputTranscriptionPayload
): Promise<string> {
  const bytes = Uint8Array.from(payload.audioData);
  if (bytes.length === 0) {
    throw new Error("No audio was captured.");
  }

  const modelId = appSettings.voice.localWhisperModelId;
  const status = await getLocalVoiceModelStatus(modelId);
  if (status.state !== "installed") {
    throw new Error("Install the selected Whisper model in Settings -> Voice before using local dictation.");
  }

  const tempDirectoryPath = await fsPromises.mkdtemp(path.join(os.tmpdir(), "nora-voice-"));
  const audioPath = path.join(tempDirectoryPath, `voice-input${getAudioExtension(payload.mimeType)}`);
  await fsPromises.writeFile(audioPath, bytes);

  try {
    return await runLocalWhisper(modelId, audioPath);
  } finally {
    await fsPromises.rm(tempDirectoryPath, { recursive: true, force: true });
  }
}

async function runLocalWhisper(modelId: AppSettings["voice"]["localWhisperModelId"], audioPath: string): Promise<string> {
  assertLocalWhisperSupportedAudioPath(audioPath);

  const modelPath = getLocalWhisperModelPath(modelId);
  const args = ["-m", modelPath, "-f", audioPath, "-nt", "-np"];
  const executablePath = await getLocalWhisperExecutablePath();
  if (!executablePath) {
    throw new Error(
      "Install local Whisper in Settings -> Voice before using local dictation."
    );
  }

  try {
    const { stdout, stderr } = await execFileAsync(executablePath, args, {
      maxBuffer: 1024 * 1024 * 10,
      encoding: "utf8"
    });
    const transcript = normalizeLocalWhisperOutput(stdout);
    if (!transcript) {
      const detail = stderr.trim() || "The recording may be silent or too short.";
      throw new Error(`Local Whisper returned no transcript. ${detail}`);
    }
    return transcript;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Local Whisper returned no transcript.")) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : "Unknown local Whisper error.";
    throw new Error(`Local Whisper transcription failed: ${detail}`);
  }
}

function assertLocalWhisperSupportedAudioPath(audioPath: string): void {
  const extension = path.extname(audioPath).toLowerCase();
  if (LOCAL_WHISPER_SUPPORTED_EXTENSIONS.has(extension)) {
    return;
  }

  throw new Error(
    `Unsupported audio format "${extension || "unknown"}" for local Whisper. Supported formats: wav, flac, mp3, ogg.`
  );
}

function normalizeLocalWhisperOutput(stdout: string): string {
  return stdout
    .split("\n")
    .map((line) => line.replace(/^\s*\[[^\]]+\]\s*/, "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getAudioExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) {
    return ".mp4";
  }
  if (mimeType.includes("ogg")) {
    return ".ogg";
  }
  if (mimeType.includes("wav")) {
    return ".wav";
  }
  return ".webm";
}
