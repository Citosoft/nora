import type { AgentContextEntry } from "@shared/appTypes";
import type { Dirent } from "node:fs";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type {
  CodexEventMessagePayload,
  CodexRolloutRecord,
  CodexRolloutSummary,
  CodexSessionMetaPayload
} from "../../types/harness-context/codex.types";
import type { HarnessContextAdapter, HarnessContextReadInput } from "../../types/harnessContext.types";
import type { ExternalHarnessArtifactCandidate } from "../../types/externalHarnessDiscovery.types";
import { normalizeComparablePath } from "@shared/pathComparison";
import { normalizeStoredResumeSessionId } from "../resumeCommandUtils";
import {
  buildHarnessContextEntry,
  hasExactUserPromptDuplicate,
  parseIsoTimestamp
} from "./contextEntryFactory";

const ROLLOUT_FILE_NAME_PREFIX = "rollout-";
const ROLLOUT_FILE_NAME_SUFFIX = ".jsonl";
const CODEX_ROLLOUT_MATCH_SKEW_MS = 5 * 60_000;
/** `session_meta` is written first; give up after a few records rather than scanning a huge rollout. */
const SESSION_META_MAX_LINES = 8;

/**
 * Rollouts are append-only and `session_meta` never changes, so a summary read once stays valid.
 * Rollouts can reach hundreds of MB; never read them whole just to identify the session.
 */
const rolloutSummaryCache = new Map<string, CodexRolloutSummary>();

function getCodexSessionsRootPath(): string {
  return path.join(os.homedir(), ".codex", "sessions");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function collectCodexMessageText(payload: CodexEventMessagePayload): string {
  return typeof payload.message === "string" ? payload.message.trim() : "";
}

function isCodexRolloutFileName(fileName: string): boolean {
  return fileName.startsWith(ROLLOUT_FILE_NAME_PREFIX) && fileName.endsWith(ROLLOUT_FILE_NAME_SUFFIX);
}

export async function listCodexRolloutFilePaths(directoryPath: string): Promise<string[]> {
  let directoryEntries: Dirent[];
  try {
    directoryEntries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    directoryEntries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return listCodexRolloutFilePaths(entryPath);
      }

      return entry.isFile() && isCodexRolloutFileName(entry.name) ? [entryPath] : [];
    })
  );

  return nested.flat();
}

const EMPTY_ROLLOUT_SUMMARY: CodexRolloutSummary = {
  sessionId: null,
  cwd: null,
  sessionStartedAtMs: null
};

function parseCodexRolloutRecord(line: string): CodexRolloutRecord | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as CodexRolloutRecord;
  } catch {
    return null;
  }
}

function parseCodexSessionMeta(record: CodexRolloutRecord): CodexRolloutSummary | null {
  if (record.type !== "session_meta" || !isRecord(record.payload)) {
    return null;
  }
  const payload = record.payload as CodexSessionMetaPayload;
  return {
    sessionId: typeof payload.id === "string" && payload.id.trim().length > 0 ? payload.id : null,
    cwd: typeof payload.cwd === "string" && payload.cwd.trim().length > 0 ? payload.cwd : null,
    sessionStartedAtMs: parseIsoTimestamp(payload.timestamp)
  };
}

/** Streams a rollout line by line so memory stays bounded by the longest single record. */
async function* readCodexRolloutLines(filePath: string): AsyncGenerator<string> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    yield* lines;
  } finally {
    lines.close();
    stream.destroy();
  }
}

async function readCodexRolloutSummary(filePath: string): Promise<CodexRolloutSummary> {
  const cached = rolloutSummaryCache.get(filePath);
  if (cached) {
    return cached;
  }

  let summary = EMPTY_ROLLOUT_SUMMARY;
  let linesRead = 0;
  for await (const line of readCodexRolloutLines(filePath)) {
    const record = parseCodexRolloutRecord(line);
    const meta = record ? parseCodexSessionMeta(record) : null;
    if (meta) {
      summary = meta;
      break;
    }
    linesRead += 1;
    if (linesRead >= SESSION_META_MAX_LINES) {
      break;
    }
  }

  // Only cache a found session_meta: a just-created rollout may not have flushed it yet.
  if (summary !== EMPTY_ROLLOUT_SUMMARY) {
    rolloutSummaryCache.set(filePath, summary);
  }
  return summary;
}

function buildCodexResumeRolloutFileNameSuffix(resumeSessionId: string): string {
  return `-${resumeSessionId}${ROLLOUT_FILE_NAME_SUFFIX}`;
}

async function chooseCodexRolloutFilePath(
  input: HarnessContextReadInput,
  sessionsRootPath: string
): Promise<string | null> {
  const forced = input.forcedArtifactPath?.trim();
  if (forced) {
    try {
      await fs.access(forced);
      return forced;
    } catch {
      return null;
    }
  }

  const rolloutFilePaths = await listCodexRolloutFilePaths(sessionsRootPath);
  if (rolloutFilePaths.length === 0) {
    return null;
  }

  const resumeSessionId = normalizeStoredResumeSessionId(input.agent.resumeSessionId || "");
  if (resumeSessionId) {
    const exactMatch = rolloutFilePaths.find((filePath) =>
      path.basename(filePath).endsWith(buildCodexResumeRolloutFileNameSuffix(resumeSessionId))
    );
    if (exactMatch) {
      return exactMatch;
    }
  }

  const candidates = await Promise.all(
    rolloutFilePaths.map(async (filePath) => {
      try {
        const [summary, stat] = await Promise.all([readCodexRolloutSummary(filePath), fs.stat(filePath)]);
        return {
          filePath,
          modifiedAtMs: stat.mtimeMs,
          summary
        };
      } catch {
        return null;
      }
    })
  );

  const bestMatch = candidates
    .flatMap((candidate) => (candidate ? [candidate] : []))
    .filter((candidate) => candidate.summary.cwd === input.agent.workspace)
    .filter((candidate) => {
      const candidateTimestamp = candidate.summary.sessionStartedAtMs ?? candidate.modifiedAtMs;
      return candidateTimestamp >= input.contextBoundaryMs - CODEX_ROLLOUT_MATCH_SKEW_MS;
    })
    .sort((left, right) => {
      const leftTimestamp = left.summary.sessionStartedAtMs ?? left.modifiedAtMs;
      const rightTimestamp = right.summary.sessionStartedAtMs ?? right.modifiedAtMs;
      return rightTimestamp - leftTimestamp;
    })[0];

  return bestMatch?.filePath || null;
}

function parseCodexHarnessEntry(
  record: CodexRolloutRecord,
  lineIndex: number,
  input: HarnessContextReadInput,
  sessionId: string
): AgentContextEntry | null {
  if (record.type !== "event_msg" || !isRecord(record.payload)) {
    return null;
  }

  const createdAtMs = parseIsoTimestamp(record.timestamp);
  if (createdAtMs === null || createdAtMs < input.contextBoundaryMs) {
    return null;
  }

  const payload = record.payload as CodexEventMessagePayload;
  const messageType = typeof payload.type === "string" ? payload.type : "";
  const content = collectCodexMessageText(payload);
  if (!content) {
    return null;
  }

  if (messageType === "user_message") {
    if (hasExactUserPromptDuplicate(input.exactEntries, content)) {
      return null;
    }

    return buildHarnessContextEntry({
      adapterKey: "codex",
      agent: input.agent,
      uniqueSuffix: `${sessionId}-${createdAtMs}-${lineIndex}`,
      createdAt: new Date(createdAtMs).toISOString(),
      kind: "user-prompt",
      title: "Prompt sent to agent",
      content,
      conversationId: sessionId
    });
  }

  if (messageType === "agent_message") {
    return buildHarnessContextEntry({
      adapterKey: "codex",
      agent: input.agent,
      uniqueSuffix: `${sessionId}-${createdAtMs}-${lineIndex}`,
      createdAt: new Date(createdAtMs).toISOString(),
      kind: "agent-output",
      title: `${input.agent.name} output`,
      content,
      conversationId: sessionId
    });
  }

  return null;
}

export async function readCodexHarnessEntries(options: {
  sessionsRootPath: string;
  input: HarnessContextReadInput;
}): Promise<AgentContextEntry[]> {
  const filePath = await chooseCodexRolloutFilePath(options.input, options.sessionsRootPath);
  if (!filePath) {
    return [];
  }

  try {
    const summary = await readCodexRolloutSummary(filePath);
    const sessionId = summary.sessionId || path.basename(filePath, ".jsonl");
    const entries: AgentContextEntry[] = [];
    let lineIndex = 0;
    for await (const line of readCodexRolloutLines(filePath)) {
      const record = parseCodexRolloutRecord(line);
      const entry = record ? parseCodexHarnessEntry(record, lineIndex, options.input, sessionId) : null;
      if (entry) {
        entries.push(entry);
      }
      lineIndex += 1;
    }
    return entries;
  } catch {
    return [];
  }
}

const isWindowsHarnessHost = (): boolean => os.platform() === "win32";

function codexWorkspacePathsMatch(cwd: string | null, workspaceAbsolutePath: string): boolean {
  if (!cwd || !workspaceAbsolutePath) {
    return false;
  }
  const windows = isWindowsHarnessHost();
  return (
    normalizeComparablePath(path.resolve(cwd), { windows }) ===
    normalizeComparablePath(path.resolve(workspaceAbsolutePath), { windows })
  );
}

function extractCodexRolloutSessionId(filePath: string, summary: CodexRolloutSummary): string {
  if (summary.sessionId) {
    return summary.sessionId;
  }
  const base = path.basename(filePath, ROLLOUT_FILE_NAME_SUFFIX);
  return base.startsWith(ROLLOUT_FILE_NAME_PREFIX) ? base.slice(ROLLOUT_FILE_NAME_PREFIX.length) : base;
}

export async function discoverCodexExternalHarnessCandidates(
  workspaceAbsolutePath: string,
  occupiedKeys: Set<string>
): Promise<ExternalHarnessArtifactCandidate[]> {
  const rolloutFilePaths = await listCodexRolloutFilePaths(getCodexSessionsRootPath());
  const bestBySession = new Map<
    string,
    { filePath: string; mtime: number; summary: CodexRolloutSummary; sessionId: string }
  >();

  for (const filePath of rolloutFilePaths) {
    try {
      const summary = await readCodexRolloutSummary(filePath);
      if (!codexWorkspacePathsMatch(summary.cwd, workspaceAbsolutePath)) {
        continue;
      }
      const sessionId = extractCodexRolloutSessionId(filePath, summary);
      if (!sessionId) {
        continue;
      }
      const occKey = `codex:${normalizeStoredResumeSessionId(sessionId)}`;
      if (occupiedKeys.has(occKey)) {
        continue;
      }
      const mtime = (await fs.stat(filePath)).mtimeMs;
      const existing = bestBySession.get(sessionId);
      if (!existing || mtime > existing.mtime) {
        bestBySession.set(sessionId, { filePath, mtime, summary, sessionId });
      }
    } catch {
      // ignore unreadable rollouts
    }
  }

  return [...bestBySession.values()]
    .map((row) => {
      const started = row.summary.sessionStartedAtMs;
      const lastUpdatedAt =
        started !== null && Number.isFinite(started) ? new Date(started).toISOString() : new Date(row.mtime).toISOString();
      const compact = row.sessionId.length > 22 ? `${row.sessionId.slice(0, 22)}…` : row.sessionId;
      return {
        toolId: "codex",
        conversationId: row.sessionId,
        primaryArtifactPath: row.filePath,
        sessionLabel: `Codex · ${compact}`,
        lastUpdatedAt
      };
    })
    .sort((left, right) => (right.lastUpdatedAt || "").localeCompare(left.lastUpdatedAt || ""))
    .slice(0, 20);
}

export const codexHarnessContextAdapter: HarnessContextAdapter = {
  toolId: "codex",
  readEntries: (input) => readCodexHarnessEntries({
    sessionsRootPath: getCodexSessionsRootPath(),
    input
  })
};
