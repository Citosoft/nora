import type { LocalVoiceModelId, LocalVoiceSetupStatus } from "@shared/appTypes";

export interface VoiceInputReadinessDeps {
  getLocalSetupStatus(modelId: LocalVoiceModelId): Promise<LocalVoiceSetupStatus>;
}
