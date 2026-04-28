import type { AiModelCatalogEntry, AiProvider } from "@shared/appTypes";

export function formatAiModelReleasedLabel(ms: number | undefined): string | null {
  if (ms === undefined || !Number.isFinite(ms)) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(ms));
}

function parseAiProvider(value: unknown): AiProvider | null {
  if (value === "openai" || value === "google" || value === "anthropic") {
    return value;
  }
  return null;
}

export function encodeChatModelChoice(provider: AiProvider, model: string): string {
  return JSON.stringify([provider, model]);
}

export function decodeChatModelChoice(value: string): { provider: AiProvider; model: string } | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      return null;
    }
    const provider = parseAiProvider(parsed[0]);
    const model = parsed[1];
    if (!provider || typeof model !== "string" || !model.trim()) {
      return null;
    }
    return { provider, model: model.trim() };
  } catch {
    return null;
  }
}

const CHAT_SELECTOR_MODEL_LIMIT = 5;

function sortCatalogNewestFirst(entries: AiModelCatalogEntry[]): AiModelCatalogEntry[] {
  return [...entries].sort((a, b) => {
    const tb = b.releasedAtMs ?? 0;
    const ta = a.releasedAtMs ?? 0;
    if (tb !== ta) {
      return tb - ta;
    }
    return a.id.localeCompare(b.id);
  });
}

export function listModelsForAiChatSelector(
  _provider: AiProvider,
  apiKey: string,
  listedModels: AiModelCatalogEntry[],
  savedModel: string,
  fallbackModel: string
): AiModelCatalogEntry[] {
  if (!apiKey.trim()) {
    return [];
  }
  const saved = savedModel.trim();
  const listed = listedModels.filter((entry) => entry.id.trim().length > 0);
  if (listed.length > 0) {
    const byId = new Map<string, AiModelCatalogEntry>();
    for (const entry of listed) {
      byId.set(entry.id, entry);
    }
    if (saved && !byId.has(saved)) {
      byId.set(saved, { id: saved });
    }
    const merged = Array.from(byId.values());
    const sorted = sortCatalogNewestFirst(merged);
    let top = sorted.slice(0, CHAT_SELECTOR_MODEL_LIMIT);
    if (saved && merged.some((m) => m.id === saved) && !top.some((m) => m.id === saved)) {
      const savedEntry = merged.find((m) => m.id === saved);
      if (savedEntry) {
        top = [savedEntry, ...sorted.filter((m) => m.id !== saved).slice(0, CHAT_SELECTOR_MODEL_LIMIT - 1)];
      }
    }
    return top;
  }
  if (saved) {
    return [{ id: saved }];
  }
  return [{ id: fallbackModel }];
}
