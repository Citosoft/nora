import type { AppSettings } from "@shared/appTypes";
import type { VoiceInputTranscriptionPayload } from "@shared/ipc/types/systemGateway.types";

const OPENAI_TRANSCRIPTIONS_ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

export async function transcribeVoiceInput(appSettings: AppSettings, payload: VoiceInputTranscriptionPayload): Promise<string> {
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
