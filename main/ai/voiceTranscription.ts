import type { AppSettings } from "@shared/appTypes";
import type { VoiceInputTranscriptionPayload } from "@shared/ipc/types/systemGateway.types";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { transcribeWithLocalVoiceModel } from "./local-voice/engines";
import { getLocalVoiceSetupStatus } from "./local-voice/setup";

const OPENAI_TRANSCRIPTIONS_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

export async function transcribeVoiceInput(appSettings: AppSettings, payload: VoiceInputTranscriptionPayload): Promise<string> {
  if (payload.audioData.length === 0) {
    throw new Error("No audio was captured.");
  }
  return appSettings.voice.dictationProvider === "local"
    ? transcribeWithLocalModel(appSettings, payload)
    : transcribeWithOpenAi(appSettings, payload);
}

async function transcribeWithOpenAi(appSettings: AppSettings, payload: VoiceInputTranscriptionPayload): Promise<string> {
  const apiKey = appSettings.ai.apiKeys.openai.trim();
  if (!apiKey) {
    throw new Error("Add an OpenAI API key in Settings → AI to use voice input transcription.");
  }

  const audioBlob = new Blob([Uint8Array.from(payload.audioData)], { type: payload.mimeType || "audio/webm" });
  const form = new FormData();
  form.append("file", audioBlob, `voice-input${getAudioExtension(payload.mimeType)}`);
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

async function transcribeWithLocalModel(appSettings: AppSettings, payload: VoiceInputTranscriptionPayload): Promise<string> {
  if (!payload.mimeType.includes("wav")) {
    throw new Error("Local voice models need WAV audio.");
  }
  const modelId = appSettings.voice.localModelId;
  const setup = await getLocalVoiceSetupStatus(modelId);
  if (setup.model.state !== "installed" || setup.runtime.state !== "installed") {
    throw new Error("Install the selected local model in Settings → Voice before using local dictation.");
  }

  const tempDirectoryPath = await fsPromises.mkdtemp(path.join(os.tmpdir(), "nora-voice-"));
  const audioPath = path.join(tempDirectoryPath, "voice-input.wav");
  await fsPromises.writeFile(audioPath, payload.audioData);

  try {
    return await transcribeWithLocalVoiceModel(modelId, audioPath);
  } finally {
    await fsPromises.rm(tempDirectoryPath, { recursive: true, force: true });
  }
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
