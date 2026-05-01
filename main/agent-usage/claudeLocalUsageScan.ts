import type {
  AgentUsageDailyRow,
  AgentUsageTokenBucket,
  AgentUsageWorktreeRow,
  ClaudeLocalUsageStats
} from "@shared/types/agentUsageStats.types";
import type { ClaudeAssistantUsageSource } from "@main/types/agent-usage/claudeLocalLog.types";
import type { Dirent } from "node:fs";
import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { AgentUsageWorktreeInput } from "@shared/types/agentUsageStats.types";
import { buildCanonicalWorktrees, resolveWorktreeForProjectCwd } from "./worktreeAttribution";

const CLAUDE_PROJECTS_DIR = path.join(homedir(), ".claude", "projects");
const YIELD_EVERY_FILES = 10;
const RECENT_DAY_COUNT = 14;

interface ClaudeParsedTurn {
  sessionId: string;
  timestamp: string;
  cwd: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

interface ClaudeAttributedTurn extends ClaudeParsedTurn {
  day: string;
  projectKey: string;
  projectLabel: string;
  worktreeId: string | null;
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

export async function listClaudeTranscriptFiles(): Promise<string[]> {
  try {
    return (await walkJsonlFiles(CLAUDE_PROJECTS_DIR)).sort();
  } catch {
    return [];
  }
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

function ensureFiniteNonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function parseClaudeAssistantUsageLine(line: string): ClaudeParsedTurn | null {
  let parsed: ClaudeAssistantUsageSource;
  try {
    parsed = JSON.parse(line) as ClaudeAssistantUsageSource;
  } catch {
    return null;
  }

  if (parsed.type !== "assistant") {
    return null;
  }

  const sessionId = typeof parsed.sessionId === "string" && parsed.sessionId.trim().length > 0 ? parsed.sessionId : null;
  const timestamp = typeof parsed.timestamp === "string" && parsed.timestamp.trim().length > 0 ? parsed.timestamp : null;
  if (!sessionId || !timestamp) {
    return null;
  }

  const usage = parsed.message?.usage;
  const inputTokens = ensureFiniteNonNegative(usage?.input_tokens);
  const outputTokens = ensureFiniteNonNegative(usage?.output_tokens);
  const cacheReadTokens = ensureFiniteNonNegative(usage?.cache_read_input_tokens);
  const cacheWriteTokens = ensureFiniteNonNegative(usage?.cache_creation_input_tokens);

  if (inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens <= 0) {
    return null;
  }

  const cwd = typeof parsed.cwd === "string" && parsed.cwd.trim().length > 0 ? parsed.cwd : null;

  return {
    sessionId,
    timestamp,
    cwd,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens
  };
}

async function parseClaudeUsageFile(filePath: string): Promise<ClaudeParsedTurn[]> {
  const turns: ClaudeParsedTurn[] = [];
  const lines = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity
  });

  for await (const line of lines) {
    const parsed = parseClaudeAssistantUsageLine(line);
    if (parsed) {
      turns.push(parsed);
    }
  }

  return turns;
}

async function yieldToEventLoop(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

function emptyBucket(): AgentUsageTokenBucket {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

function addToBucket(target: AgentUsageTokenBucket, turn: ClaudeParsedTurn): void {
  target.inputTokens += turn.inputTokens;
  target.outputTokens += turn.outputTokens;
  target.cacheReadTokens += turn.cacheReadTokens;
  target.cacheWriteTokens += turn.cacheWriteTokens;
}

function mergeDaily(
  map: Map<string, AgentUsageDailyRow>,
  day: string,
  turn: ClaudeAttributedTurn
): void {
  const existing = map.get(day);
  if (existing) {
    existing.inputTokens += turn.inputTokens;
    existing.outputTokens += turn.outputTokens;
    existing.cacheReadTokens += turn.cacheReadTokens;
    existing.cacheWriteTokens += turn.cacheWriteTokens;
    return;
  }
  map.set(day, {
    day,
    inputTokens: turn.inputTokens,
    outputTokens: turn.outputTokens,
    cacheReadTokens: turn.cacheReadTokens,
    cacheWriteTokens: turn.cacheWriteTokens,
    reasoningOutputTokens: 0
  });
}

function mergeWorktree(
  map: Map<string, AgentUsageWorktreeRow>,
  turn: ClaudeAttributedTurn
): void {
  const key = turn.projectKey;
  const existing = map.get(key);
  if (existing) {
    existing.inputTokens += turn.inputTokens;
    existing.outputTokens += turn.outputTokens;
    existing.cacheReadTokens += turn.cacheReadTokens;
    existing.cacheWriteTokens += turn.cacheWriteTokens;
    return;
  }
  map.set(key, {
    worktreeId: turn.worktreeId,
    projectLabel: turn.projectLabel,
    inputTokens: turn.inputTokens,
    outputTokens: turn.outputTokens,
    cacheReadTokens: turn.cacheReadTokens,
    cacheWriteTokens: turn.cacheWriteTokens,
    reasoningOutputTokens: 0
  });
}

function buildRecentDays(daily: Map<string, AgentUsageDailyRow>): AgentUsageDailyRow[] {
  const days = [...daily.keys()].sort();
  const tail = days.slice(-RECENT_DAY_COUNT);
  return tail.map((day) => daily.get(day)!);
}

export async function scanClaudeLocalUsage(worktrees: AgentUsageWorktreeInput[]): Promise<ClaudeLocalUsageStats> {
  const files = await listClaudeTranscriptFiles();
  const canonicalWorktrees = await buildCanonicalWorktrees(worktrees);

  const totals = emptyBucket();
  const dailyMap = new Map<string, AgentUsageDailyRow>();
  const worktreeMap = new Map<string, AgentUsageWorktreeRow>();

  for (const [index, filePath] of files.entries()) {
    const turns = await parseClaudeUsageFile(filePath);
    for (const turn of turns) {
      addToBucket(totals, turn);
      const day = parseIsoDay(turn.timestamp);
      if (!day) {
        continue;
      }
      const attr = await resolveWorktreeForProjectCwd(turn.cwd, canonicalWorktrees);
      const attributed: ClaudeAttributedTurn = {
        ...turn,
        day,
        projectKey: attr.projectKey,
        projectLabel: attr.projectLabel,
        worktreeId: attr.worktreeId
      };
      mergeDaily(dailyMap, day, attributed);
      mergeWorktree(worktreeMap, attributed);
    }
    if ((index + 1) % YIELD_EVERY_FILES === 0) {
      await yieldToEventLoop();
    }
  }

  const topWorktrees = [...worktreeMap.values()]
    .sort((left, right) => {
      const l = left.inputTokens + left.outputTokens + left.cacheReadTokens + left.cacheWriteTokens;
      const r = right.inputTokens + right.outputTokens + right.cacheReadTokens + right.cacheWriteTokens;
      return r - l;
    })
    .slice(0, 12);

  return {
    transcriptFilesScanned: files.length,
    totals,
    recentDays: buildRecentDays(dailyMap),
    topWorktrees
  };
}
