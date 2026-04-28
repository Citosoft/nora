import type { AiModelCatalogEntry, AiProvider, ListAiModelsResult } from "@shared/appTypes";

const OPENAI_MODELS_ENDPOINT = "https://api.openai.com/v1/models";
const ANTHROPIC_MODELS_ENDPOINT = "https://api.anthropic.com/v1/models";
const GOOGLE_MODELS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export async function listProviderModels(provider: AiProvider, apiKey: string): Promise<ListAiModelsResult> {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new Error(`Add a ${provider} API key to detect available models.`);
  }

  switch (provider) {
    case "openai":
      return {
        provider,
        models: sortCatalogNewestFirst(await listOpenAiModels(trimmedApiKey))
      };
    case "google":
      return {
        provider,
        models: sortCatalogNewestFirst(await listGoogleModels(trimmedApiKey))
      };
    case "anthropic":
      return {
        provider,
        models: sortCatalogNewestFirst(await listAnthropicModels(trimmedApiKey))
      };
  }
}

function parseIsoToReleasedAtMs(value: string | undefined): number | undefined {
  if (!value || typeof value !== "string") {
    return undefined;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

function parseGooglePublishTimeMs(publishTime: unknown): number | undefined {
  if (typeof publishTime === "string" && publishTime.trim()) {
    return parseIsoToReleasedAtMs(publishTime);
  }
  if (publishTime && typeof publishTime === "object" && "seconds" in publishTime) {
    const raw = (publishTime as { seconds?: string | number }).seconds;
    const sec = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(sec) ? sec * 1000 : undefined;
  }
  return undefined;
}

function mergeCatalogEntriesById(entries: AiModelCatalogEntry[]): AiModelCatalogEntry[] {
  const byId = new Map<string, AiModelCatalogEntry>();
  for (const entry of entries) {
    const id = entry.id.trim();
    if (!id) {
      continue;
    }
    const normalized: AiModelCatalogEntry = { id, releasedAtMs: entry.releasedAtMs };
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, normalized);
      continue;
    }
    const prev = existing.releasedAtMs ?? 0;
    const next = normalized.releasedAtMs ?? 0;
    if (next >= prev) {
      byId.set(id, normalized);
    }
  }
  return Array.from(byId.values());
}

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

async function listOpenAiModels(apiKey: string): Promise<AiModelCatalogEntry[]> {
  const response = await fetch(OPENAI_MODELS_ENDPOINT, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });
  if (!response.ok) {
    throw new Error(`OpenAI model lookup failed (${response.status}).`);
  }

  const payload = await response.json() as { data?: Array<{ id?: string; created?: number }> };
  const entries = (payload.data ?? [])
    .map((entry) => {
      const id = typeof entry.id === "string" ? entry.id : "";
      const created = typeof entry.created === "number" && Number.isFinite(entry.created) ? entry.created : undefined;
      const releasedAtMs = created !== undefined ? created * 1000 : undefined;
      return { id, releasedAtMs } satisfies AiModelCatalogEntry;
    })
    .filter(
      (entry) =>
        entry.id.startsWith("gpt-") || entry.id.startsWith("o1") || entry.id.startsWith("o3") || entry.id.startsWith("o4")
    );

  return mergeCatalogEntriesById(entries);
}

async function listGoogleModels(apiKey: string): Promise<AiModelCatalogEntry[]> {
  const response = await fetch(`${GOOGLE_MODELS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "GET"
  });
  if (!response.ok) {
    throw new Error(`Google model lookup failed (${response.status}).`);
  }

  const payload = await response.json() as {
    models?: Array<{
      name?: string;
      supportedGenerationMethods?: string[];
      publishTime?: unknown;
    }>;
  };

  const entries = (payload.models ?? [])
    .filter((model) => (model.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((model) => {
      const name = typeof model.name === "string" ? model.name : "";
      const id = name.startsWith("models/") ? name.slice("models/".length) : name;
      const releasedAtMs = parseGooglePublishTimeMs(model.publishTime);
      return { id, releasedAtMs } satisfies AiModelCatalogEntry;
    })
    .filter((entry) => entry.id.startsWith("gemini-"));

  return mergeCatalogEntriesById(entries);
}

async function listAnthropicModels(apiKey: string): Promise<AiModelCatalogEntry[]> {
  const response = await fetch(ANTHROPIC_MODELS_ENDPOINT, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    }
  });
  if (!response.ok) {
    throw new Error(`Anthropic model lookup failed (${response.status}).`);
  }

  const payload = await response.json() as {
    data?: Array<{ id?: string; created_at?: string }>;
  };
  const entries = (payload.data ?? [])
    .map((entry) => {
      const id = typeof entry.id === "string" ? entry.id : "";
      const releasedAtMs = parseIsoToReleasedAtMs(
        typeof entry.created_at === "string" ? entry.created_at : undefined
      );
      return { id, releasedAtMs } satisfies AiModelCatalogEntry;
    })
    .filter((entry) => entry.id.startsWith("claude-"));

  return mergeCatalogEntriesById(entries);
}
