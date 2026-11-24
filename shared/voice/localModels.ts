import type { LocalVoiceEngineDescriptor, LocalVoiceEngineId, LocalVoiceModelDescriptor, LocalVoiceModelId } from "../types/voice.types";

export const LOCAL_VOICE_ENGINES: Readonly<Record<LocalVoiceEngineId, LocalVoiceEngineDescriptor>> = {
  whisperCpp: { id: "whisperCpp", name: "whisper.cpp" },
  sherpaOnnx: { id: "sherpaOnnx", name: "sherpa-onnx" }
};

/** Free models Nora can download and run offline. Keyed by id so every model id must be described. */
const LOCAL_VOICE_MODEL_CATALOG: Readonly<Record<LocalVoiceModelId, LocalVoiceModelDescriptor>> = {
  "whisper-base.en": {
    id: "whisper-base.en",
    name: "Whisper Base (English)",
    description: "OpenAI's open Whisper model. A good balance of speed and accuracy.",
    vendor: "openai",
    engine: "whisperCpp",
    approximateSizeMb: 142
  },
  "whisper-tiny.en": {
    id: "whisper-tiny.en",
    name: "Whisper Tiny (English)",
    description: "The smallest Whisper model. Fastest, but less accurate.",
    vendor: "openai",
    engine: "whisperCpp",
    approximateSizeMb: 75
  },
  "parakeet-tdt-0.6b-v2": {
    id: "parakeet-tdt-0.6b-v2",
    name: "Parakeet v2 (English)",
    description: "NVIDIA's Parakeet TDT 0.6B. Very accurate English with punctuation, and fast on recent computers.",
    vendor: "nvidia",
    engine: "sherpaOnnx",
    approximateSizeMb: 460
  },
  "parakeet-tdt-0.6b-v3": {
    id: "parakeet-tdt-0.6b-v3",
    name: "Parakeet v3 (Multilingual)",
    description: "NVIDIA's Parakeet TDT 0.6B for 25 European languages, detected automatically.",
    vendor: "nvidia",
    engine: "sherpaOnnx",
    approximateSizeMb: 465
  }
};

/** Settings order. */
export const LOCAL_VOICE_MODEL_IDS = ["whisper-base.en", "whisper-tiny.en", "parakeet-tdt-0.6b-v2", "parakeet-tdt-0.6b-v3"] as const satisfies readonly [LocalVoiceModelId, ...LocalVoiceModelId[]];

export const LOCAL_VOICE_MODELS: readonly LocalVoiceModelDescriptor[] = LOCAL_VOICE_MODEL_IDS.map((id) => LOCAL_VOICE_MODEL_CATALOG[id]);

export const DEFAULT_LOCAL_VOICE_MODEL_ID: LocalVoiceModelId = "whisper-base.en";

export function isLocalVoiceModelId(value: unknown): value is LocalVoiceModelId {
  return typeof value === "string" && Object.hasOwn(LOCAL_VOICE_MODEL_CATALOG, value);
}

export function localVoiceModel(id: LocalVoiceModelId): LocalVoiceModelDescriptor {
  return LOCAL_VOICE_MODEL_CATALOG[id];
}
