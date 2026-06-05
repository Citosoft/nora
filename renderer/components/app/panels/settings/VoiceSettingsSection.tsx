import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { SettingRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type {
  LocalVoiceModelStatus,
  LocalVoiceRuntimeStatus,
  LocalWhisperModelId,
  VoiceDictationProvider
} from "@shared/appTypes";
import { Download, Mic2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

const LOCAL_WHISPER_MODEL_LABELS: Record<LocalWhisperModelId, string> = {
  "tiny.en": "Whisper tiny.en",
  "base.en": "Whisper base.en"
};

const LOCAL_WHISPER_MODELS: LocalWhisperModelId[] = ["tiny.en", "base.en"];

function parseVoiceDictationProvider(value: string): VoiceDictationProvider {
  return value === "localWhisper" ? "localWhisper" : "openai";
}

function parseLocalWhisperModelId(value: string): LocalWhisperModelId {
  return value === "tiny.en" ? "tiny.en" : "base.en";
}

function formatModelSize(sizeBytes: number | null): string {
  if (typeof sizeBytes !== "number") {
    return "";
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024 / 1024))} MB`;
}

export function VoiceSettingsSection() {
  const { appSettings, updateVoiceSettings } = useSettingsRuntime();
  const [modelStatus, setModelStatus] = useState<LocalVoiceModelStatus | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<LocalVoiceRuntimeStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const selectedModelId = appSettings.voice.localWhisperModelId;
  const isModelInstalled = modelStatus?.state === "installed";
  const isRuntimeInstalled = runtimeStatus?.state === "installed";
  const isLocalWhisperReady = isModelInstalled && isRuntimeInstalled;

  const refreshModelStatus = async () => {
    setIsLoadingStatus(true);
    setInstallError(null);
    try {
      const [nextModelStatus, nextRuntimeStatus] = await Promise.all([
        noraSystemClient.getLocalVoiceModelStatus(selectedModelId),
        noraSystemClient.getLocalVoiceRuntimeStatus()
      ]);
      setModelStatus(nextModelStatus);
      setRuntimeStatus(nextRuntimeStatus);
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : "Unable to inspect local Whisper setup.");
      setModelStatus(null);
      setRuntimeStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    void refreshModelStatus();
  }, [selectedModelId]);

  const handleInstallLocalWhisper = async () => {
    setIsInstalling(true);
    setInstallError(null);
    try {
      if (!isRuntimeInstalled) {
        setRuntimeStatus(await noraSystemClient.installLocalVoiceRuntime());
      }
      setModelStatus(await noraSystemClient.installLocalVoiceModel(selectedModelId));
      await refreshModelStatus();
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : "Unable to install local Whisper.");
    } finally {
      setIsInstalling(false);
    }
  };

  const installedLabel =
    modelStatus?.state === "installed"
      ? `Model installed${formatModelSize(modelStatus.sizeBytes) ? ` (${formatModelSize(modelStatus.sizeBytes)})` : ""}`
      : "Model not installed";
  const runtimeLabel = runtimeStatus?.state === "installed"
    ? `Runtime ready${runtimeStatus.executablePath ? ` (${runtimeStatus.executablePath})` : ""}`
    : "Runtime not installed";
  const installButtonLabel = isInstalling
    ? "Installing"
    : isLocalWhisperReady
      ? "Reinstall"
      : "Install";

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="Voice"
        description="Choose how Nora transcribes microphone dictation."
        icon={Mic2}
      />

      <SettingRow
        title="Dictation Engine"
        description="Use OpenAI transcription through your API key, or use an installed local Whisper model."
        control={(
          <Select
            value={appSettings.voice.dictationProvider}
            onChange={(event) =>
              updateVoiceSettings({
                ...appSettings.voice,
                dictationProvider: parseVoiceDictationProvider(event.target.value)
              })}
            aria-label="Voice dictation engine"
          >
            <option value="openai">OpenAI API</option>
            <option value="localWhisper">Local Whisper</option>
          </Select>
        )}
      />

      <SettingRow
        title="Local Whisper"
        description="Install the whisper.cpp runtime and selected model with one click so dictation can run without sending audio to OpenAI."
        control={(
          <div className="space-y-2">
            <div className="flex flex-row items-center gap-2">
              <Select
                className="min-w-0 flex-1"
                value={selectedModelId}
                onChange={(event) =>
                  updateVoiceSettings({
                    ...appSettings.voice,
                    localWhisperModelId: parseLocalWhisperModelId(event.target.value)
                  })}
                aria-label="Local Whisper model"
              >
                {LOCAL_WHISPER_MODELS.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {LOCAL_WHISPER_MODEL_LABELS[modelId]}
                  </option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 px-0"
                onClick={() => void refreshModelStatus()}
                disabled={isLoadingStatus || isInstalling}
                title="Refresh local Whisper status"
                aria-label="Refresh local Whisper status"
              >
                <RefreshCcw className={`size-4 ${isLoadingStatus ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-2"
                onClick={() => void handleInstallLocalWhisper()}
                disabled={isInstalling || isLoadingStatus}
              >
                <Download className={`size-4 ${isInstalling ? "animate-pulse" : ""}`} aria-hidden />
                {installButtonLabel}
              </Button>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>{installedLabel}</div>
              <div className={isRuntimeInstalled ? undefined : "text-destructive"}>{runtimeLabel}</div>
            </div>
            {installError ? <div className="text-xs text-destructive">{installError}</div> : null}
          </div>
        )}
      />
    </div>
  );
}
