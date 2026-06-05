export type VoiceDictationProvider = "openai" | "localWhisper";

export type LocalWhisperModelId = "tiny.en" | "base.en";

export interface VoiceSettings {
  dictationProvider: VoiceDictationProvider;
  localWhisperModelId: LocalWhisperModelId;
}

export type LocalVoiceModelInstallState = "not-installed" | "installed";

export interface LocalVoiceModelStatus {
  modelId: LocalWhisperModelId;
  state: LocalVoiceModelInstallState;
  filePath: string;
  sizeBytes: number | null;
}

export interface LocalVoiceRuntimeStatus {
  state: LocalVoiceModelInstallState;
  executablePath: string | null;
  checkedPaths: string[];
}
