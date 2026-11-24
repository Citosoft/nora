/** Cloud transcription through an API key, or a model that runs on this computer. */
export type VoiceDictationProvider = "openai" | "local";

/** The runtime that executes a local model: whisper.cpp for Whisper, sherpa-onnx for NVIDIA Parakeet. */
export type LocalVoiceEngineId = "whisperCpp" | "sherpaOnnx";

export type LocalVoiceModelId = "whisper-tiny.en" | "whisper-base.en" | "parakeet-tdt-0.6b-v2" | "parakeet-tdt-0.6b-v3";

/** Who made a local model; Settings shows the maker's logo beside it. */
export type LocalVoiceModelVendor = "openai" | "nvidia";

export interface LocalVoiceModelDescriptor {
  id: LocalVoiceModelId;
  name: string;
  description: string;
  vendor: LocalVoiceModelVendor;
  engine: LocalVoiceEngineId;
  approximateSizeMb: number;
}

export interface LocalVoiceEngineDescriptor {
  id: LocalVoiceEngineId;
  name: string;
}

export interface VoiceSettings {
  dictationProvider: VoiceDictationProvider;
  localModelId: LocalVoiceModelId;
}

export type LocalVoiceInstallState = "not-installed" | "installed";

export interface LocalVoiceModelStatus {
  modelId: LocalVoiceModelId;
  state: LocalVoiceInstallState;
  sizeBytes: number | null;
}

export interface LocalVoiceRuntimeStatus {
  engine: LocalVoiceEngineId;
  state: LocalVoiceInstallState;
  executablePath: string | null;
}

/** Everything needed to run one local model: its weights and its engine's runtime. */
export interface LocalVoiceSetupStatus {
  model: LocalVoiceModelStatus;
  runtime: LocalVoiceRuntimeStatus;
}

/** Whether the configured dictation provider can transcribe right now; `reason` says what to set up when it can't. */
export type VoiceInputReadiness =
  | { state: "ready" }
  | { state: "unconfigured"; reason: string };
