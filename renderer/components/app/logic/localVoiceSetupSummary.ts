import type { LocalVoiceModelDescriptor, LocalVoiceSetupStatus } from "@shared/appTypes";
import type { LocalVoiceSetupSummary } from "@/components/app/types/localVoiceSetup.types";
import { LOCAL_VOICE_ENGINES } from "@shared/voice/localModels";

function formatMegabytes(sizeBytes: number): string {
  return `${Math.max(1, Math.round(sizeBytes / 1024 / 1024))} MB`;
}

export function summarizeLocalVoiceSetup(model: LocalVoiceModelDescriptor, setup: LocalVoiceSetupStatus | null, installing: boolean): LocalVoiceSetupSummary {
  const engine = LOCAL_VOICE_ENGINES[model.engine].name;
  const modelInstalled = setup?.model.state === "installed";
  const runtimeInstalled = setup?.runtime.state === "installed";
  const ready = modelInstalled && runtimeInstalled;
  const size = setup?.model.sizeBytes ? formatMegabytes(setup.model.sizeBytes) : `about ${model.approximateSizeMb} MB`;
  const status = !setup
    ? "Checking…"
    : ready
      ? `Installed (${size}) · runs on ${engine}`
      : modelInstalled
        ? `Downloaded, but ${engine} isn't installed yet`
        : runtimeInstalled
          ? `Not downloaded · ${size}`
          : `Not downloaded · ${size}, plus ${engine}`;
  return { ready, status, installLabel: installing ? "Installing…" : ready ? "Reinstall" : "Install" };
}
