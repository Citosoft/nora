import type { LocalVoiceEngineId, LocalVoiceRuntimeStatus } from "@shared/appTypes";

/** How a model's weights are fetched into its directory under userData/voice-models. */
export type LocalVoiceModelDownload =
  | { kind: "file"; url: string; fileName: string }
  /** A .tar.bz2 whose single top-level folder holds `requiredFiles`; it is unpacked without that folder. */
  | { kind: "tarBz2"; url: string; requiredFiles: readonly string[] };

export interface WhisperCppModelSource {
  engine: "whisperCpp";
  directory: string;
  download: Extract<LocalVoiceModelDownload, { kind: "file" }>;
}

export interface SherpaOnnxTransducerFiles {
  encoder: string;
  decoder: string;
  joiner: string;
  tokens: string;
}

export interface SherpaOnnxModelSource {
  engine: "sherpaOnnx";
  directory: string;
  download: Extract<LocalVoiceModelDownload, { kind: "tarBz2" }>;
  modelType: "nemo_transducer";
  files: SherpaOnnxTransducerFiles;
}

/** Main-process details for one catalog model; `engine` must match the shared descriptor's engine. */
export type LocalVoiceModelSource = WhisperCppModelSource | SherpaOnnxModelSource;

export type LocalVoiceModelSourceFor<E extends LocalVoiceEngineId> = Extract<LocalVoiceModelSource, { engine: E }>;

/** The install side of an engine, which is the same whatever model it will run. */
export interface LocalVoiceRuntime {
  id: LocalVoiceEngineId;
  getRuntimeStatus(): Promise<LocalVoiceRuntimeStatus>;
  /** Installs the runtime if it is missing and returns its status. */
  installRuntime(): Promise<LocalVoiceRuntimeStatus>;
}

/** A runtime that executes one family of local speech-to-text models. */
export interface LocalVoiceEngine<E extends LocalVoiceEngineId> extends LocalVoiceRuntime {
  id: E;
  /** Transcribes a 16 kHz mono WAV file with an installed model. */
  transcribe(source: LocalVoiceModelSourceFor<E>, modelDirectory: string, wavPath: string): Promise<string>;
}
