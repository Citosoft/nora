import type { AiSettings, AiSimpleTaskProvider } from "@shared/types/ai.types";

/** Shared by persistence and UI updates so newly supported sources survive every save path. */
export function parseAiSimpleTaskProvider(value: unknown): AiSimpleTaskProvider {
  return value === "local" || value === "codex" || value === "claude" ? value : "cloud";
}

export function canGenerateSimpleText(settings: AiSettings): boolean {
  return settings.simpleTaskProvider !== "cloud" || Object.values(settings.apiKeys).some((key) => key.trim().length > 0);
}
