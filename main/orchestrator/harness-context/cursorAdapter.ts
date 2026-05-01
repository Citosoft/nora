import type { AgentContextEntry } from "@shared/appTypes";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CursorTranscriptRecord } from "../../types/harness-context/cursor.types";
import type { HarnessContextAdapter, HarnessContextReadInput } from "../../types/harnessContext.types";
import type { ExternalHarnessArtifactCandidate } from "../../types/externalHarnessDiscovery.types";
import { normalizeStoredResumeSessionId } from "../resumeCommandUtils";
import {
  buildHarnessContextEntry,
  hasExactUserPromptDuplicate
} from "./contextEntryFactory";

const CURSOR_TRANSCRIPT_MATCH_SKEW_MS = 5 * 60_000;

function getCursorProjectsRootPath(): string {
  return path.join(os.homedir(), ".cursor", "projects");
}

export function buildCursorProjectDirectoryName(workspacePath: string): string {
  return workspacePath.replace(/^[\\/]+/, "").replace(/[\\/]+/g, "-");
}

function collectCursorMessageText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  const parts = content.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const blockType = "type" in entry ? entry.type : null;
    const textValue = "text" in entry ? entry.text : null;
    if (blockType !== "text" || typeof textValue !== "string") {
      return [];
    }

    const trimmed = textValue.trim();
    return trimmed ? [trimmed] : [];
  });

  return parts.join("\n\n").trim();
}

async function listCursorTranscriptFilePaths(projectDirectoryPath: string): Promise<string[]> {
  const transcriptsRootPath = path.join(projectDirectoryPath, "agent-transcripts");

  let directoryEntries: Dirent[];
  try {
    directoryEntries = await fs.readdir(transcriptsRootPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    directoryEntries.map(async (entry) => {
      if (!entry.isDirectory()) {
        return [];
      }

      const transcriptFilePath = path.join(transcriptsRootPath, entry.name, `${entry.name}.jsonl`);
      try {
        await fs.access(transcriptFilePath);
        return [transcriptFilePath];
      } catch {
        return [];
      }
    })
  );

  return nested.flat();
}

async function chooseCursorTranscriptFilePath(
  input: HarnessContextReadInput,
  projectsRootPath: string
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

  const projectDirectoryPath = path.join(projectsRootPath, buildCursorProjectDirectoryName(input.agent.workspace));
  const transcriptFilePaths = await listCursorTranscriptFilePaths(projectDirectoryPath);
  if (transcriptFilePaths.length === 0) {
    return null;
  }

  const resumeSessionId = normalizeStoredResumeSessionId(input.agent.resumeSessionId || "");
  if (resumeSessionId) {
    const directMatch = transcriptFilePaths.find((filePath) => path.basename(filePath, ".jsonl") === resumeSessionId);
    if (directMatch) {
      return directMatch;
    }
  }

  const candidates = await Promise.all(
    transcriptFilePaths.map(async (filePath) => {
      try {
        const stat = await fs.stat(filePath);
        return {
          filePath,
          modifiedAtMs: stat.mtimeMs
        };
      } catch {
        return null;
      }
    })
  );

  const newestCandidate = candidates
    .flatMap((candidate) => (candidate ? [candidate] : []))
    .filter((candidate) => candidate.modifiedAtMs >= input.contextBoundaryMs - CURSOR_TRANSCRIPT_MATCH_SKEW_MS)
    .sort((left, right) => right.modifiedAtMs - left.modifiedAtMs)[0];

  return newestCandidate?.filePath || null;
}

function parseCursorHarnessEntries(
  raw: string,
  input: HarnessContextReadInput,
  fileModifiedAtMs: number,
  transcriptId: string
): AgentContextEntry[] {
  const out: AgentContextEntry[] = [];

  raw.split("\n").forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let parsed: CursorTranscriptRecord;
    try {
      parsed = JSON.parse(trimmed) as CursorTranscriptRecord;
    } catch {
      return;
    }

    const createdAtMs = fileModifiedAtMs + lineIndex;
    const role = typeof parsed.role === "string" ? parsed.role : "";
    const content = collectCursorMessageText(parsed.message?.content);
    if (!content) {
      return;
    }

    if (role === "user") {
      if (hasExactUserPromptDuplicate(input.exactEntries, content)) {
        return;
      }

      out.push(buildHarnessContextEntry({
        adapterKey: "cursor",
        agent: input.agent,
        uniqueSuffix: `${transcriptId}-${lineIndex}`,
        createdAt: new Date(createdAtMs).toISOString(),
        kind: "user-prompt",
        title: "Prompt sent to agent",
        content,
        conversationId: transcriptId
      }));
      return;
    }

    if (role === "assistant") {
      out.push(buildHarnessContextEntry({
        adapterKey: "cursor",
        agent: input.agent,
        uniqueSuffix: `${transcriptId}-${lineIndex}`,
        createdAt: new Date(createdAtMs).toISOString(),
        kind: "agent-output",
        title: `${input.agent.name} output`,
        content,
        conversationId: transcriptId
      }));
    }
  });

  return out;
}

export async function readCursorHarnessEntries(options: {
  projectsRootPath: string;
  input: HarnessContextReadInput;
}): Promise<AgentContextEntry[]> {
  const filePath = await chooseCursorTranscriptFilePath(options.input, options.projectsRootPath);
  if (!filePath) {
    return [];
  }

  try {
    const [raw, stat] = await Promise.all([
      fs.readFile(filePath, "utf8"),
      fs.stat(filePath)
    ]);
    return parseCursorHarnessEntries(raw, options.input, stat.mtimeMs, path.basename(filePath, ".jsonl"));
  } catch {
    return [];
  }
}

export async function discoverCursorExternalHarnessCandidates(
  workspaceAbsolutePath: string,
  occupiedKeys: Set<string>
): Promise<ExternalHarnessArtifactCandidate[]> {
  const projectDirectoryPath = path.join(getCursorProjectsRootPath(), buildCursorProjectDirectoryName(workspaceAbsolutePath));
  const transcriptFilePaths = await listCursorTranscriptFilePaths(projectDirectoryPath);
  const rows: ExternalHarnessArtifactCandidate[] = [];

  for (const filePath of transcriptFilePaths) {
    const conversationId = path.basename(filePath, ".jsonl");
    if (!conversationId) {
      continue;
    }
    if (occupiedKeys.has(`cursor:${normalizeStoredResumeSessionId(conversationId)}`)) {
      continue;
    }
    try {
      const stat = await fs.stat(filePath);
      rows.push({
        toolId: "cursor",
        conversationId,
        primaryArtifactPath: filePath,
        sessionLabel: `Cursor · ${conversationId.length > 18 ? `${conversationId.slice(0, 18)}…` : conversationId}`,
        lastUpdatedAt: new Date(stat.mtimeMs).toISOString()
      });
    } catch {
      // ignore
    }
  }

  return rows.sort((left, right) => (right.lastUpdatedAt || "").localeCompare(left.lastUpdatedAt || "")).slice(0, 20);
}

export const cursorHarnessContextAdapter: HarnessContextAdapter = {
  toolId: "cursor",
  readEntries: (input) => readCursorHarnessEntries({
    projectsRootPath: getCursorProjectsRootPath(),
    input
  })
};
