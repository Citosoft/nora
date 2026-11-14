import { parseAiSimpleTaskProvider } from "@shared/ai/settings";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { formatAiModelReleasedLabel } from "@/components/app/logic/aiChatSelection";
import { SettingRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { RuntimeTaskModelSetting } from "@/components/app/panels/settings/RuntimeTaskModelSetting";
import { TaskSourceOptionLabel } from "@/components/app/panels/settings/TaskSourceOptionLabel";
import { AiProviderOptionLabel } from "@/components/app/panels/settings/AiProviderOptionLabel";
import { AiProviderLogo } from "@/components/app/views/AiProviderLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  AiModelCatalogEntry,
  AiSimpleTaskSettings,
  AiProvider,
  LocalAiModelStatus,
  LocalAiRuntimeStatus,
  LocalLlmModelId
} from "@shared/appTypes";
import { Bot, Download, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic"
};

const PROVIDERS: AiProvider[] = ["openai", "google", "anthropic"];

const LOCAL_LLM_MODEL_LABELS: Record<LocalLlmModelId, string> = {
  "qwen2.5-0.5b-instruct": "Qwen 2.5 0.5B Instruct",
  "smollm2-360m-instruct": "SmolLM2 360M Instruct"
};

const LOCAL_LLM_MODELS: LocalLlmModelId[] = ["qwen2.5-0.5b-instruct", "smollm2-360m-instruct"];

function parseAiProvider(value: string): AiProvider {
  if (value === "openai" || value === "google" || value === "anthropic") {
    return value;
  }
  return "openai";
}

function parseLocalLlmModelId(value: string): LocalLlmModelId {
  return value === "smollm2-360m-instruct" ? "smollm2-360m-instruct" : "qwen2.5-0.5b-instruct";
}

function formatModelSize(sizeBytes: number | null): string {
  if (typeof sizeBytes !== "number") {
    return "";
  }
  return `${Math.max(1, Math.round(sizeBytes / 1024 / 1024))} MB`;
}

function sortModelCatalogNewestFirst(entries: AiModelCatalogEntry[]): AiModelCatalogEntry[] {
  return [...entries].sort((a, b) => {
    const tb = b.releasedAtMs ?? 0;
    const ta = a.releasedAtMs ?? 0;
    if (tb !== ta) {
      return tb - ta;
    }
    return a.id.localeCompare(b.id);
  });
}

export function AiSettingsSection() {
  const {
    appSettings,
    updateAiPreferredProvider,
    updateAiApiKey,
    updateAiModel,
    updateAiSimpleTaskSettings,
    aiModelOptions,
    aiModelLoading,
    aiModelError,
    refreshAiModels
  } = useSettingsRuntime();
  const [modelStatus, setModelStatus] = useState<LocalAiModelStatus | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<LocalAiRuntimeStatus | null>(null);
  const [isLoadingLocalStatus, setIsLoadingLocalStatus] = useState(false);
  const [isInstallingLocal, setIsInstallingLocal] = useState(false);
  const [localInstallError, setLocalInstallError] = useState<string | null>(null);

  const activeProvider = appSettings.ai.preferredProvider;
  const activeModelOptions = useMemo(
    () => sortModelCatalogNewestFirst(aiModelOptions[activeProvider] ?? []),
    [activeProvider, aiModelOptions]
  );
  const activeModel = appSettings.ai.modelByProvider[activeProvider];
  const activeProviderHasKey = appSettings.ai.apiKeys[activeProvider].trim().length > 0;
  const hasModelSelection = activeModelOptions.length > 0;
  const usesLocalSimpleTasks = appSettings.ai.simpleTaskProvider === "local";
  /** The API key and model rows serve both simple tasks and memory reviews (chosen in Settings → Bots). */
  const usesCloud = appSettings.ai.simpleTaskProvider === "cloud" || appSettings.ai.memoryReview.provider === "cloud";
  const saveSimpleTasks = (patch: Partial<AiSimpleTaskSettings>): void => updateAiSimpleTaskSettings({
    simpleTaskProvider: appSettings.ai.simpleTaskProvider, localLlmModelId: appSettings.ai.localLlmModelId,
    runtimeModelByProvider: appSettings.ai.runtimeModelByProvider, memoryReview: appSettings.ai.memoryReview, ...patch
  });
  const selectedLocalModelId = appSettings.ai.localLlmModelId;
  const isLocalModelInstalled = modelStatus?.state === "installed";
  const isLocalRuntimeInstalled = runtimeStatus?.state === "installed";
  const isLocalReady = isLocalModelInstalled && isLocalRuntimeInstalled;

  const refreshLocalStatus = async () => {
    setIsLoadingLocalStatus(true);
    setLocalInstallError(null);
    try {
      const [nextModelStatus, nextRuntimeStatus] = await Promise.all([
        noraSystemClient.getLocalAiModelStatus(selectedLocalModelId),
        noraSystemClient.getLocalAiRuntimeStatus()
      ]);
      setModelStatus(nextModelStatus);
      setRuntimeStatus(nextRuntimeStatus);
    } catch (error) {
      setLocalInstallError(error instanceof Error ? error.message : "Unable to inspect local model setup.");
      setModelStatus(null);
      setRuntimeStatus(null);
    } finally {
      setIsLoadingLocalStatus(false);
    }
  };

  useEffect(() => {
    void refreshLocalStatus();
  }, [selectedLocalModelId]);

  const handleInstallLocalModel = async () => {
    setIsInstallingLocal(true);
    setLocalInstallError(null);
    try {
      if (!isLocalRuntimeInstalled) {
        setRuntimeStatus(await noraSystemClient.installLocalAiRuntime());
      }
      setModelStatus(await noraSystemClient.installLocalAiModel(selectedLocalModelId));
      await refreshLocalStatus();
    } catch (error) {
      setLocalInstallError(error instanceof Error ? error.message : "Unable to install local model.");
    } finally {
      setIsInstallingLocal(false);
    }
  };

  const localInstallButtonLabel = isInstallingLocal
    ? "Installing"
    : isLocalReady
      ? "Reinstall"
      : "Install";
  const localModelLabel =
    modelStatus?.state === "installed"
      ? `Model installed${formatModelSize(modelStatus.sizeBytes) ? ` (${formatModelSize(modelStatus.sizeBytes)})` : ""}`
      : "Model not installed";
  const localRuntimeLabel = runtimeStatus?.state === "installed"
    ? `Runtime ready${runtimeStatus.executablePath ? ` (${runtimeStatus.executablePath})` : ""}`
    : "Runtime not installed";

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="AI"
        description="Choose how Nora generates commit messages, thread names and memory reviews using signed-in runtimes, cloud API keys, or on-device models."
        icon={Bot}
      />

      <SettingRow
        title="Simple AI Tasks"
        description="Choose the source for commit messages and automatic names for new threads."
        control={(
          <Select
            value={appSettings.ai.simpleTaskProvider}
            onChange={(event) =>
              saveSimpleTasks({ simpleTaskProvider: parseAiSimpleTaskProvider(event.target.value) })}
            aria-label="Simple AI task provider"
          >
            <option value="codex"><TaskSourceOptionLabel source="codex" label="Codex runtime (existing sign-in)" /></option>
            <option value="claude"><TaskSourceOptionLabel source="claude" label="Claude runtime (existing sign-in)" /></option>
            <option value="cloud"><TaskSourceOptionLabel source="cloud" label="Cloud API (BYOK)" /></option>
            <option value="local"><TaskSourceOptionLabel source="local" label="Local model" /></option>
          </Select>
        )}
      />

      {appSettings.ai.simpleTaskProvider === "codex" || appSettings.ai.simpleTaskProvider === "claude" ? (
        <RuntimeTaskModelSetting
          title="Runtime Model"
          description="The model simple tasks use. A small, fast model keeps commit messages and thread names quick and cheap."
          provider={appSettings.ai.simpleTaskProvider}
          value={appSettings.ai.runtimeModelByProvider[appSettings.ai.simpleTaskProvider]}
          onChange={(model) => saveSimpleTasks({
            runtimeModelByProvider: { ...appSettings.ai.runtimeModelByProvider, [appSettings.ai.simpleTaskProvider]: model }
          })}
        />
      ) : usesLocalSimpleTasks ? (
        <SettingRow
          title="Local Model"
          description="Install the llama.cpp runtime and a small GGUF model with one click. Generation stays on your machine."
          control={(
            <div className="space-y-2">
              <div className="flex flex-row items-center gap-2">
                <Select
                  className="min-w-0 flex-1"
                  value={selectedLocalModelId}
                  onChange={(event) =>
                    saveSimpleTasks({ simpleTaskProvider: "local", localLlmModelId: parseLocalLlmModelId(event.target.value) })}
                  aria-label="Local model"
                >
                  {LOCAL_LLM_MODELS.map((modelId) => (
                    <option key={modelId} value={modelId}>
                      {LOCAL_LLM_MODEL_LABELS[modelId]}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 px-0"
                  onClick={() => void refreshLocalStatus()}
                  disabled={isLoadingLocalStatus || isInstallingLocal}
                  title="Refresh local model status"
                  aria-label="Refresh local model status"
                >
                  <RefreshCcw className={`size-4 ${isLoadingLocalStatus ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-2"
                  onClick={() => void handleInstallLocalModel()}
                  disabled={isInstallingLocal || isLoadingLocalStatus}
                >
                  <Download className={`size-4 ${isInstallingLocal ? "animate-pulse" : ""}`} aria-hidden />
                  {localInstallButtonLabel}
                </Button>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>{localModelLabel}</div>
                <div className={isLocalRuntimeInstalled ? undefined : "text-destructive"}>{localRuntimeLabel}</div>
              </div>
              {localInstallError ? <div className="text-xs text-destructive">{localInstallError}</div> : null}
            </div>
          )}
        />
      ) : null}

      {usesCloud ? (
        <>
          <SettingRow
            title="Preferred Provider"
            description="Choose which provider Nora should use first. If that key is missing, Nora falls back to another configured provider."
            control={(
              <Select
                value={appSettings.ai.preferredProvider}
                onChange={(event) => updateAiPreferredProvider(parseAiProvider(event.target.value))}
                aria-label="Preferred AI provider"
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    <AiProviderOptionLabel provider={provider} label={PROVIDER_LABELS[provider]} />
                  </option>
                ))}
              </Select>
            )}
          />

          <SettingRow
            title="Generation Model"
            description="Detected from your selected provider API key. Choose which model Nora should use when a task uses the Cloud API."
            control={(
              <div className="space-y-2">
                <div className="flex flex-row items-center gap-2">
                  <AiProviderLogo
                    provider={activeProvider}
                    className="size-9 shrink-0 rounded-[5px] [&_img]:size-6"
                  />
                  <Select
                    className="min-w-0 flex-1"
                    value={activeModel}
                    onChange={(event) => updateAiModel(activeProvider, event.target.value)}
                    aria-label="AI model selector"
                    disabled={!activeProviderHasKey || aiModelLoading[activeProvider] || !hasModelSelection}
                  >
                    {hasModelSelection
                      ? activeModelOptions.map((entry) => {
                          const dateLabel = formatAiModelReleasedLabel(entry.releasedAtMs);
                          return (
                            <option key={entry.id} value={entry.id}>
                              <AiProviderOptionLabel provider={activeProvider} label={dateLabel ? `${entry.id} · ${dateLabel}` : entry.id} />
                            </option>
                          );
                        })
                      : <option value={activeModel}>{activeProviderHasKey ? activeModel : "Add API key first"}</option>}
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 px-0"
                    onClick={() => refreshAiModels(activeProvider)}
                    disabled={!activeProviderHasKey || aiModelLoading[activeProvider]}
                    title="Refresh models from provider API"
                    aria-label="Refresh models from provider API"
                  >
                    <RefreshCcw className={`size-4 ${aiModelLoading[activeProvider] ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                {aiModelError[activeProvider] ? (
                  <div className="text-xs text-destructive">{aiModelError[activeProvider]}</div>
                ) : null}
              </div>
            )}
          />

          <SettingRow
            title="OpenAI API Key"
            description="Used when OpenAI is selected as the preferred provider or as an available fallback."
            control={(
              <Input
                type="password"
                value={appSettings.ai.apiKeys.openai}
                onChange={(event) => updateAiApiKey("openai", event.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
            )}
          />

          <SettingRow
            title="Google API Key"
            description="Used for Gemini-based generation when Google is selected or available as a fallback."
            control={(
              <Input
                type="password"
                value={appSettings.ai.apiKeys.google}
                onChange={(event) => updateAiApiKey("google", event.target.value)}
                placeholder="AIza..."
                autoComplete="off"
              />
            )}
          />

          <SettingRow
            title="Anthropic API Key"
            description="Used for Claude-based generation when Anthropic is selected or available as a fallback."
            control={(
              <Input
                type="password"
                value={appSettings.ai.apiKeys.anthropic}
                onChange={(event) => updateAiApiKey("anthropic", event.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
              />
            )}
          />
        </>
      ) : null}
    </div>
  );
}
