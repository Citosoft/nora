import type { LocalVoiceModelId, VoiceDictationProvider, VoiceSettings } from "../types/voice.types";
import { DEFAULT_LOCAL_VOICE_MODEL_ID, isLocalVoiceModelId } from "./localModels";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  dictationProvider: "openai",
  localModelId: DEFAULT_LOCAL_VOICE_MODEL_ID
};

/** Settings saved before local models were generalized used Whisper-only names. */
const LEGACY_PROVIDERS: Readonly<Record<string, VoiceDictationProvider>> = { localWhisper: "local" };
const LEGACY_MODEL_IDS: Readonly<Record<string, LocalVoiceModelId>> = { "tiny.en": "whisper-tiny.en", "base.en": "whisper-base.en" };

function parseProvider(value: unknown): VoiceDictationProvider {
  if (value === "openai" || value === "local") return value;
  return (typeof value === "string" && LEGACY_PROVIDERS[value]) || DEFAULT_VOICE_SETTINGS.dictationProvider;
}

function parseModelId(value: unknown, legacy: unknown): LocalVoiceModelId {
  if (isLocalVoiceModelId(value)) return value;
  return (typeof legacy === "string" && LEGACY_MODEL_IDS[legacy]) || DEFAULT_VOICE_SETTINGS.localModelId;
}

/** Normalizes stored or synced voice settings (an untyped boundary), migrating legacy Whisper-only values. */
export function parseVoiceSettings(candidate: unknown): VoiceSettings {
  if (!candidate || typeof candidate !== "object") return DEFAULT_VOICE_SETTINGS;
  const stored = candidate as Record<string, unknown>;
  return {
    dictationProvider: parseProvider(stored.dictationProvider),
    localModelId: parseModelId(stored.localModelId, stored.localWhisperModelId)
  };
}
