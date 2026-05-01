import type { AgentContextEntry } from "@shared/appTypes";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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

function parseCodexRolloutSummary(raw: string): CodexRolloutSummary {
  const defaultSummary: CodexRolloutSummary = {
    sessionId: null,
    cwd: null,
    sessionStartedAtMs: null
  };

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    let parsed: CodexRolloutRecord;
    try {
      parsed = JSON.parse(trimmed) as CodexRolloutRecord;
    } catch {
      continue;
    }

    if (parsed.type !== "session_meta" || !isRecord(parsed.payload)) {
      continue;
    }

    const payload = parsed.payload as CodexSessionMetaPayload;
    return {
      sessionId: typeof payload.id === "string" && payload.id.trim().length > 0 ? payload.id : null,
      cwd: typeof payload.cwd === "string" && payload.cwd.trim().length > 0 ? payload.cwd : null,
      sessionStartedAtMs: parseIsoTimestamp(payload.timestamp)
    };
  }

  return defaultSummary;
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
        const [raw, stat] = await Promise.all([
          fs.readFile(filePath, "utf8"),
          fs.stat(filePath)
        ]);
        return {
          filePath,
          modifiedAtMs: stat.mtimeMs,
          summary: parseCodexRolloutSummary(raw)
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

function parseCodexHarnessEntries(
  raw: string,
  input: HarnessContextReadInput,
  sessionId: string
): AgentContextEntry[] {
  const out: AgentContextEntry[] = [];

  raw.split("\n").forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let parsed: CodexRolloutRecord;
    try {
      parsed = JSON.parse(trimmed) as CodexRolloutRecord;
    } catch {
      return;
    }

    if (parsed.type !== "event_msg" || !isRecord(parsed.payload)) {
      return;
    }

    const createdAtMs = parseIsoTimestamp(parsed.timestamp);
    if (createdAtMs === null || createdAtMs < input.contextBoundaryMs) {
      return;
    }

    const payload = parsed.payload as CodexEventMessagePayload;
    const messageType = typeof payload.type === "string" ? payload.type : "";
    const content = collectCodexMessageText(payload);
    if (!content) {
      return;
    }

    if (messageType === "user_message") {
      if (hasExactUserPromptDuplicate(input.exactEntries, content)) {
        return;
      }

      out.push(buildHarnessContextEntry({
        adapterKey: "codex",
        agent: input.agent,
        uniqueSuffix: `${sessionId}-${createdAtMs}-${lineIndex}`,
        createdAt: new Date(createdAtMs).toISOString(),
        kind: "user-prompt",
        title: "Prompt sent to agent",
        content,
        conversationId: sessionId
      }));
      return;
    }

    if (messageType === "agent_message") {
      out.push(buildHarnessContextEntry({
        adapterKey: "codex",
        agent: input.agent,
        uniqueSuffix: `${sessionId}-${createdAtMs}-${lineIndex}`,
        createdAt: new Date(createdAtMs).toISOString(),
        kind: "agent-output",
        title: `${input.agent.name} output`,
        content,
        conversationId: sessionId
      }));
    }
  });

  return out;
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
    const raw = await fs.readFile(filePath, "utf8");
    const summary = parseCodexRolloutSummary(raw);
    return parseCodexHarnessEntries(raw, options.input, summary.sessionId || path.basename(filePath, ".jsonl"));
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
      const [raw, stat] = await Promise.all([fs.readFile(filePath, "utf8"), fs.stat(filePath)]);
      const summary = parseCodexRolloutSummary(raw);
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
      const mtime = stat.mtimeMs;
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
