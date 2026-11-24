import type { LocalVoiceModelId, LocalVoiceSetupStatus } from "@shared/appTypes";
import { runtimeForLocalVoiceModel } from "./engines";
import { downloadLocalVoiceModel, getLocalVoiceModelStatus } from "./models";

export async function getLocalVoiceSetupStatus(modelId: LocalVoiceModelId): Promise<LocalVoiceSetupStatus> {
  const [model, runtime] = await Promise.all([
    getLocalVoiceModelStatus(modelId),
    runtimeForLocalVoiceModel(modelId).getRuntimeStatus()
  ]);
  return { model, runtime };
}

/** Installs the model's engine runtime when missing, then (re)downloads the model weights. */
export async function installLocalVoiceModel(modelId: LocalVoiceModelId): Promise<LocalVoiceSetupStatus> {
  const runtime = await runtimeForLocalVoiceModel(modelId).installRuntime();
  const model = await downloadLocalVoiceModel(modelId);
  return { model, runtime };
}
