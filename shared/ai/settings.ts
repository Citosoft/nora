import type { AiMemoryReviewSettings, AiRuntimeTaskProvider, AiSettings, AiSimpleTaskProvider } from "@shared/types/ai.types";

const RUNTIME_MODEL_MAX = 512;

/** Shared by persistence and UI updates so newly supported sources survive every save path. */
export function parseAiSimpleTaskProvider(value: unknown): AiSimpleTaskProvider {
  return value === "local" || value === "codex" || value === "claude" ? value : "cloud";
}

const runtimeModel = (entry: unknown): string | null => typeof entry === "string" && entry.trim() && entry.trim().length <= RUNTIME_MODEL_MAX ? entry.trim() : null;

/**
 * The saved memory review settings. Before they existed, reviews used the simple-task source, so that source carries over
 * unless it is the local model, which a review cannot use; then the Claude runtime.
 */
export function parseMemoryReviewSettings(value: unknown, simpleTaskProvider: AiSimpleTaskProvider): AiMemoryReviewSettings {
  const record = typeof value === "object" && value !== null ? value as Partial<Record<keyof AiMemoryReviewSettings, unknown>> : null;
  const saved = record?.provider === "codex" || record?.provider === "claude" || record?.provider === "cloud" ? record.provider : null;
  return { provider: saved ?? (simpleTaskProvider === "local" ? "claude" : simpleTaskProvider), runtimeModel: runtimeModel(record?.runtimeModel) };
}

/** A saved runtime model id per runtime; anything else falls back to the runtime's own default (null). */
export function parseRuntimeModelByProvider(value: unknown): Record<AiRuntimeTaskProvider, string | null> {
  const record = typeof value === "object" && value !== null ? value as Partial<Record<AiRuntimeTaskProvider, unknown>> : {};
  return { codex: runtimeModel(record.codex), claude: runtimeModel(record.claude) };
}

export function canGenerateSimpleText(settings: AiSettings): boolean {
  return settings.simpleTaskProvider !== "cloud" || Object.values(settings.apiKeys).some((key) => key.trim().length > 0);
}
