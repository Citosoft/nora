import type {
  AgentUsageDailyRow,
  AgentUsageWorktreeRow,
  CodexLocalUsageStats
} from "@shared/types/agentUsageStats.types";
import type {
  CodexLocalParseContext,
  CodexLocalRawRecord,
  CodexLocalRawUsage
} from "@main/types/agent-usage/codexLocalLog.types";
import type { AgentUsageWorktreeInput } from "@shared/types/agentUsageStats.types";
import type { Dirent } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { readdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { buildCanonicalWorktrees, resolveWorktreeForProjectCwd } from "./worktreeAttribution";

const LEGACY_FALLBACK_MODEL = "gpt-5";
const YIELD_EVERY_FILES = 10;
const RECENT_DAY_COUNT = 14;

function getCodexSessionsDirectory(): string {
  const codexHome = process.env.CODEX_HOME?.trim();
  if (codexHome) {
    return path.join(codexHome, "sessions");
  }
  return path.join(homedir(), ".codex", "sessions");
}

async function walkJsonlFiles(dirPath: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonlFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function listCodexSessionJsonlFiles(): Promise<string[]> {
  try {
    return (await walkJsonlFiles(getCodexSessionsDirectory())).sort();
  } catch {
    return [];
  }
}

function ensureNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeRawUsage(value: unknown): CodexLocalRawUsage | null {
  if (value == null || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const inputTokens = ensureNumber(record.input_tokens);
  const cachedInputTokens = ensureNumber(record.cached_input_tokens ?? record.cache_read_input_tokens);
  const outputTokens = ensureNumber(record.output_tokens);
  const reasoningOutputTokens = ensureNumber(record.reasoning_output_tokens);
  const totalTokens = ensureNumber(record.total_tokens);

  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningOutputTokens,
    totalTokens: totalTokens > 0 ? totalTokens : inputTokens + outputTokens
  };
}

function subtractRawUsage(current: CodexLocalRawUsage, previous: CodexLocalRawUsage | null): CodexLocalRawUsage {
  return {
    inputTokens: Math.max(current.inputTokens - (previous?.inputTokens ?? 0), 0),
    cachedInputTokens: Math.max(current.cachedInputTokens - (previous?.cachedInputTokens ?? 0), 0),
    outputTokens: Math.max(current.outputTokens - (previous?.outputTokens ?? 0), 0),
    reasoningOutputTokens: Math.max(current.reasoningOutputTokens - (previous?.reasoningOutputTokens ?? 0), 0),
    totalTokens: Math.max(current.totalTokens - (previous?.totalTokens ?? 0), 0)
  };
}

function extractString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractModel(value: unknown): string | null {
  if (value == null || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const direct = [extractString(record.model), extractString(record.model_name)].find((c) => c !== null) ?? null;
  if (direct) {
    return direct;
  }

  if (record.info && typeof record.info === "object") {
    const info = record.info as Record<string, unknown>;
    const infoDirect = [extractString(info.model), extractString(info.model_name)].find((c) => c !== null) ?? null;
    if (infoDirect) {
      return infoDirect;
    }
    if (info.metadata && typeof info.metadata === "object") {
      const metadata = info.metadata as Record<string, unknown>;
      const metadataModel = extractString(metadata.model);
      if (metadataModel) {
        return metadataModel;
      }
    }
  }

  if (record.metadata && typeof record.metadata === "object") {
    const metadata = record.metadata as Record<string, unknown>;
    return extractString(metadata.model);
  }

  return null;
}

function parseIsoDay(timestamp: string): string | null {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface CodexParsedDelta {
  sessionId: string;
  timestamp: string;
  cwd: string | null;
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
}

export function parseCodexUsageLine(line: string, context: CodexLocalParseContext): CodexParsedDelta | null {
  let parsed: CodexLocalRawRecord;
  try {
    parsed = JSON.parse(line) as CodexLocalRawRecord;
  } catch {
    return null;
  }

  if (!parsed.type || !parsed.payload || typeof parsed.payload !== "object") {
    return null;
  }

  const payload = parsed.payload;

  if (parsed.type === "session_meta") {
    context.sessionId = extractString(payload.id) ?? context.sessionId;
    context.sessionCwd = extractString(payload.cwd);
    if (!context.currentCwd && context.sessionCwd) {
      context.currentCwd = context.sessionCwd;
    }
    return null;
  }

  if (parsed.type === "turn_context") {
    context.currentCwd = extractString(payload.cwd) ?? context.currentCwd ?? context.sessionCwd;
    context.currentModel = extractModel(payload) ?? context.currentModel;
    return null;
  }

  if (parsed.type !== "event_msg" || payload.type !== "token_count" || typeof parsed.timestamp !== "string") {
    return null;
  }

  const info = payload.info;
  if (info == null || typeof info !== "object") {
    return null;
  }

  const infoRecord = info as Record<string, unknown>;
  const totalUsage = normalizeRawUsage(infoRecord.total_token_usage);
  const lastUsage = normalizeRawUsage(infoRecord.last_token_usage);
  let delta = totalUsage ? subtractRawUsage(totalUsage, context.previousTotals) : lastUsage;
  if (totalUsage) {
    context.previousTotals = totalUsage;
  }
  if (!delta) {
    return null;
  }

  delta = {
    ...delta,
    cachedInputTokens: Math.min(delta.cachedInputTokens, delta.inputTokens)
  };

  if (
    delta.inputTokens === 0 &&
    delta.cachedInputTokens === 0 &&
    delta.outputTokens === 0 &&
    delta.reasoningOutputTokens === 0 &&
    delta.totalTokens === 0
  ) {
    return null;
  }

  const resolvedModel = extractModel(payload) ?? context.currentModel;
  const model = resolvedModel ?? LEGACY_FALLBACK_MODEL;

  return {
    sessionId: context.sessionId,
    timestamp: parsed.timestamp,
    cwd: context.currentCwd ?? context.sessionCwd,
    model,
    inputTokens: delta.inputTokens,
    cachedInputTokens: delta.cachedInputTokens,
    outputTokens: delta.outputTokens,
    reasoningOutputTokens: delta.reasoningOutputTokens,
    totalTokens: delta.totalTokens
  };
}

interface CodexAttributed extends CodexParsedDelta {
  day: string;
  projectKey: string;
  projectLabel: string;
  worktreeId: string | null;
}

async function parseCodexUsageFile(filePath: string): Promise<CodexParsedDelta[]> {
  const lines = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity
  });

  const context: CodexLocalParseContext = {
    sessionId: path.basename(filePath, ".jsonl"),
    sessionCwd: null,
    currentCwd: null,
    currentModel: null,
    previousTotals: null
  };

  const out: CodexParsedDelta[] = [];

  for await (const line of lines) {
    const parsed = parseCodexUsageLine(line, context);
    if (!parsed) {
      continue;
    }
    out.push(parsed);
  }

  return out;
}

async function yieldToEventLoop(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

function mergeDailyCodex(map: Map<string, AgentUsageDailyRow>, row: CodexAttributed): void {
  const existing = map.get(row.day);
  if (existing) {
    existing.inputTokens += row.inputTokens;
    existing.outputTokens += row.outputTokens;
    existing.cacheReadTokens += row.cachedInputTokens;
    existing.reasoningOutputTokens += row.reasoningOutputTokens;
    return;
  }
  map.set(row.day, {
    day: row.day,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    cacheReadTokens: row.cachedInputTokens,
    cacheWriteTokens: 0,
    reasoningOutputTokens: row.reasoningOutputTokens
  });
}

function mergeWorktreeCodex(map: Map<string, AgentUsageWorktreeRow>, row: CodexAttributed): void {
  const existing = map.get(row.projectKey);
  if (existing) {
    existing.inputTokens += row.inputTokens;
    existing.outputTokens += row.outputTokens;
    existing.cacheReadTokens += row.cachedInputTokens;
    existing.reasoningOutputTokens += row.reasoningOutputTokens;
    return;
  }
  map.set(row.projectKey, {
    worktreeId: row.worktreeId,
    projectLabel: row.projectLabel,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    cacheReadTokens: row.cachedInputTokens,
    cacheWriteTokens: 0,
    reasoningOutputTokens: row.reasoningOutputTokens
  });
}

function buildRecentDays(daily: Map<string, AgentUsageDailyRow>): AgentUsageDailyRow[] {
  const days = [...daily.keys()].sort();
  const tail = days.slice(-RECENT_DAY_COUNT);
  return tail.map((day) => daily.get(day)!);
}

export async function scanCodexLocalUsage(worktrees: AgentUsageWorktreeInput[]): Promise<CodexLocalUsageStats> {
  const files = await listCodexSessionJsonlFiles();
  const canonicalWorktrees = await buildCanonicalWorktrees(worktrees);

  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  let reasoningOutputTokens = 0;
  let totalTokens = 0;

  const dailyMap = new Map<string, AgentUsageDailyRow>();
  const worktreeMap = new Map<string, AgentUsageWorktreeRow>();

  for (const [index, filePath] of files.entries()) {
    const rawRows = await parseCodexUsageFile(filePath);
    for (const row of rawRows) {
      const day = parseIsoDay(row.timestamp);
      if (!day) {
        continue;
      }
      const attr = await resolveWorktreeForProjectCwd(row.cwd, canonicalWorktrees);
      const attributed: CodexAttributed = {
        ...row,
        day,
        projectKey: attr.projectKey,
        projectLabel: attr.projectLabel,
        worktreeId: attr.worktreeId
      };

      inputTokens += attributed.inputTokens;
      outputTokens += attributed.outputTokens;
      cachedInputTokens += attributed.cachedInputTokens;
      reasoningOutputTokens += attributed.reasoningOutputTokens;
      totalTokens += attributed.totalTokens;

      mergeDailyCodex(dailyMap, attributed);
      mergeWorktreeCodex(worktreeMap, attributed);
    }
    if ((index + 1) % YIELD_EVERY_FILES === 0) {
      await yieldToEventLoop();
    }
  }

  const topWorktrees = [...worktreeMap.values()]
    .sort((left, right) => {
      const l = left.inputTokens + left.outputTokens + left.cacheReadTokens + left.reasoningOutputTokens;
      const r = right.inputTokens + right.outputTokens + right.cacheReadTokens + right.reasoningOutputTokens;
      return r - l;
    })
    .slice(0, 12);

  return {
    sessionFilesScanned: files.length,
    totals: {
      inputTokens,
      outputTokens,
      cacheReadTokens: cachedInputTokens,
      cacheWriteTokens: 0,
      reasoningOutputTokens,
      totalTokens
    },
    recentDays: buildRecentDays(dailyMap),
    topWorktrees
  };
}
