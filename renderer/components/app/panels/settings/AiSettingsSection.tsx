import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { formatAiModelReleasedLabel } from "@/components/app/logic/aiChatSelection";
import { SettingRow, SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import { AiProviderLogo } from "@/components/app/views/AiProviderLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AiModelCatalogEntry, AiProvider } from "@shared/appTypes";
import { Bot, RefreshCcw } from "lucide-react";
import { useMemo } from "react";

const PROVIDER_LABELS: Record<AiProvider, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic"
};

const PROVIDERS: AiProvider[] = ["openai", "google", "anthropic"];

function parseAiProvider(value: string): AiProvider {
  if (value === "openai" || value === "google" || value === "anthropic") {
    return value;
  }
  return "openai";
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
    aiModelOptions,
    aiModelLoading,
    aiModelError,
    refreshAiModels
  } = useSettingsRuntime();
  const activeProvider = appSettings.ai.preferredProvider;
  const activeModelOptions = useMemo(
    () => sortModelCatalogNewestFirst(aiModelOptions[activeProvider] ?? []),
    [activeProvider, aiModelOptions]
  );
  const activeModel = appSettings.ai.modelByProvider[activeProvider];
  const activeProviderHasKey = appSettings.ai.apiKeys[activeProvider].trim().length > 0;
  const hasModelSelection = activeModelOptions.length > 0;

  return (
    <div className="max-w-4xl">
      <SettingsSectionHeader
        title="AI"
        description="Configure BYOK providers used for built-in AI features like commit message generation."
        icon={Bot}
      />

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
                {PROVIDER_LABELS[provider]}
              </option>
            ))}
          </Select>
        )}
      />

      <SettingRow
        title="Commit Message Model"
        description="Detected from your selected provider API key. Choose which model Nora should use for commit message generation."
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
                          {dateLabel ? `${entry.id} · ${dateLabel}` : entry.id}
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
    </div>
  );
}
