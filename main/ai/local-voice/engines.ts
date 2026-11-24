import type { LocalVoiceEngine, LocalVoiceRuntime } from "@main/types/localVoice.types";
import type { LocalVoiceEngineId, LocalVoiceModelId } from "@shared/appTypes";
import { getLocalVoiceModelDirectory, LOCAL_VOICE_MODEL_SOURCES } from "./models";
import { sherpaOnnxEngine } from "./sherpaOnnx";
import { whisperCppEngine } from "./whisperCpp";

const LOCAL_VOICE_ENGINES: { readonly [E in LocalVoiceEngineId]: LocalVoiceEngine<E> } = {
  whisperCpp: whisperCppEngine,
  sherpaOnnx: sherpaOnnxEngine
};

export function runtimeForLocalVoiceModel(modelId: LocalVoiceModelId): LocalVoiceRuntime {
  return LOCAL_VOICE_ENGINES[LOCAL_VOICE_MODEL_SOURCES[modelId].engine];
}

/** Runs an installed model on a WAV file, handing each engine the source shape it understands. */
export function transcribeWithLocalVoiceModel(modelId: LocalVoiceModelId, wavPath: string): Promise<string> {
  const source = LOCAL_VOICE_MODEL_SOURCES[modelId];
  const directory = getLocalVoiceModelDirectory(modelId);
  switch (source.engine) {
    case "whisperCpp": return LOCAL_VOICE_ENGINES.whisperCpp.transcribe(source, directory, wavPath);
    case "sherpaOnnx": return LOCAL_VOICE_ENGINES.sherpaOnnx.transcribe(source, directory, wavPath);
  }
}
