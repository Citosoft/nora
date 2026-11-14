import { DEFAULT_APP_SETTINGS, type AppSettings } from "@shared/appTypes";
import { parseAiSimpleTaskProvider, parseMemoryReviewSettings, parseRuntimeModelByProvider } from "@shared/ai/settings";

export function normalizeAppSettings(candidate: AppSettings): AppSettings {
  const preferredProvider =
    candidate.ai?.preferredProvider === "openai" ||
    candidate.ai?.preferredProvider === "google" ||
    candidate.ai?.preferredProvider === "anthropic"
      ? candidate.ai.preferredProvider
      : DEFAULT_APP_SETTINGS.ai.preferredProvider;

  return {
    ...DEFAULT_APP_SETTINGS,
    ...candidate,
    terminalQuickLaunchDefaults: {
      ...DEFAULT_APP_SETTINGS.terminalQuickLaunchDefaults,
      ...candidate.terminalQuickLaunchDefaults
    },
    terminalPresets: Array.isArray(candidate.terminalPresets) ? candidate.terminalPresets : DEFAULT_APP_SETTINGS.terminalPresets,
    ai: {
      preferredProvider,
      apiKeys: {
        ...DEFAULT_APP_SETTINGS.ai.apiKeys,
        ...(candidate.ai?.apiKeys ?? {})
      },
      modelByProvider: {
        ...DEFAULT_APP_SETTINGS.ai.modelByProvider,
        ...(candidate.ai?.modelByProvider ?? {})
      },
      simpleTaskProvider: parseAiSimpleTaskProvider(candidate.ai?.simpleTaskProvider),
      localLlmModelId:
        candidate.ai?.localLlmModelId === "qwen2.5-0.5b-instruct" || candidate.ai?.localLlmModelId === "smollm2-360m-instruct"
          ? candidate.ai.localLlmModelId
          : DEFAULT_APP_SETTINGS.ai.localLlmModelId,
      runtimeModelByProvider: parseRuntimeModelByProvider(candidate.ai?.runtimeModelByProvider),
      memoryReview: parseMemoryReviewSettings(candidate.ai?.memoryReview, parseAiSimpleTaskProvider(candidate.ai?.simpleTaskProvider))
    },
    voice: {
      dictationProvider:
        candidate.voice?.dictationProvider === "openai" || candidate.voice?.dictationProvider === "localWhisper"
          ? candidate.voice.dictationProvider
          : DEFAULT_APP_SETTINGS.voice.dictationProvider,
      localWhisperModelId:
        candidate.voice?.localWhisperModelId === "tiny.en" || candidate.voice?.localWhisperModelId === "base.en"
          ? candidate.voice.localWhisperModelId
          : DEFAULT_APP_SETTINGS.voice.localWhisperModelId
    }
  };
}
