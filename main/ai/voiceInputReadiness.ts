import type { AppSettings, VoiceInputReadiness } from "@shared/appTypes";
import type { VoiceInputReadinessDeps } from "@main/types/voiceInputReadiness.types";
import { LOCAL_VOICE_ENGINES, localVoiceModel } from "@shared/voice/localModels";

/** Checks the selected dictation provider without exposing keys or install paths to the renderer. */
export async function getVoiceInputReadiness(appSettings: AppSettings, deps: VoiceInputReadinessDeps): Promise<VoiceInputReadiness> {
  if (appSettings.voice.dictationProvider === "openai") {
    return appSettings.ai.apiKeys.openai.trim()
      ? { state: "ready" }
      : { state: "unconfigured", reason: "Add an OpenAI API key in Settings → AI to use voice input." };
  }

  const model = localVoiceModel(appSettings.voice.localModelId);
  const setup = await deps.getLocalSetupStatus(model.id);
  if (setup.runtime.state !== "installed") {
    return { state: "unconfigured", reason: `Install ${model.name} in Settings → Voice to use voice input (it needs ${LOCAL_VOICE_ENGINES[model.engine].name}).` };
  }
  if (setup.model.state !== "installed") {
    return { state: "unconfigured", reason: `Install ${model.name} in Settings → Voice to use voice input.` };
  }
  return { state: "ready" };
}
