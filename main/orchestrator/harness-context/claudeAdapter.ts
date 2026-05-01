import type { AgentContextEntry } from "@shared/appTypes";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ClaudeSessionRecord } from "../../types/harness-context/claude.types";
import type { HarnessContextAdapter, HarnessContextReadInput } from "../../types/harnessContext.types";
import type { ExternalHarnessArtifactCandidate } from "../../types/externalHarnessDiscovery.types";
import { normalizeStoredResumeSessionId } from "../resumeCommandUtils";
import { buildHarnessContextEntry, hasExactUserPromptDuplicate, parseIsoTimestamp } from "./contextEntryFactory";

function getClaudeProjectsRootPath(): string {
  return path.join(os.homedir(), ".claude", "projects");
}

export function buildClaudeProjectDirectoryName(workspacePath: string): string {
  return workspacePath.replace(/[\\/]+/g, "-");
}

function collectClaudeUserText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  return "";
}

function collectClaudeAssistantText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  const parts = content
    .flatMap((entry) => {
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

function parseClaudeSessionEntries(
  raw: string,
  input: HarnessContextReadInput
): AgentContextEntry[] {
  const out: AgentContextEntry[] = [];

  raw.split("\n").forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let parsed: ClaudeSessionRecord;
    try {
      parsed = JSON.parse(trimmed) as ClaudeSessionRecord;
    } catch {
      return;
    }

    const createdAtMs = parseIsoTimestamp(parsed.timestamp);
    if (createdAtMs === null || createdAtMs < input.contextBoundaryMs) {
      return;
    }

    if (typeof parsed.cwd === "string" && parsed.cwd !== input.agent.workspace) {
      return;
    }

    const sessionId = typeof parsed.sessionId === "string" && parsed.sessionId.trim().length > 0
      ? parsed.sessionId
      : "unknown";
    const recordType = typeof parsed.type === "string" ? parsed.type : "";

    if (recordType === "user") {
      const content = collectClaudeUserText(parsed.message?.content);
      if (!content || hasExactUserPromptDuplicate(input.exactEntries, content)) {
        return;
      }

      out.push(buildHarnessContextEntry({
        adapterKey: "claude",
        agent: input.agent,
        uniqueSuffix: `${sessionId}-${lineIndex}`,
        createdAt: new Date(createdAtMs).toISOString(),
        kind: "user-prompt",
        title: "Prompt sent to agent",
        content,
        conversationId: sessionId
      }));
      return;
    }

    if (recordType === "assistant") {
      const content = collectClaudeAssistantText(parsed.message?.content);
      if (!content) {
        return;
      }

      out.push(buildHarnessContextEntry({
        adapterKey: "claude",
        agent: input.agent,
        uniqueSuffix: `${sessionId}-${lineIndex}`,
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

async function chooseClaudeSessionFilePath(
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

  const projectDirectoryPath = path.join(projectsRootPath, buildClaudeProjectDirectoryName(input.agent.workspace));

  let directoryEntries: path.ParsedPath[] | null = null;
  try {
    const rawEntries = await fs.readdir(projectDirectoryPath, { withFileTypes: true });
    directoryEntries = rawEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".jsonl"))
      .map((entry) => path.parse(entry.name));
  } catch {
    return null;
  }

  if (directoryEntries.length === 0) {
    return null;
  }

  const candidates = await Promise.all(
    directoryEntries.map(async (entry) => {
      const filePath = path.join(projectDirectoryPath, `${entry.name}${entry.ext}`);
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
    .filter((candidate) => candidate.modifiedAtMs >= input.contextBoundaryMs - 60_000)
    .sort((left, right) => right.modifiedAtMs - left.modifiedAtMs)[0];

  return newestCandidate?.filePath || null;
}

export async function readClaudeHarnessEntries(options: {
  projectsRootPath: string;
  input: HarnessContextReadInput;
}): Promise<AgentContextEntry[]> {
  const filePath = await chooseClaudeSessionFilePath(options.input, options.projectsRootPath);
  if (!filePath) {
    return [];
  }

  try {
    return parseClaudeSessionEntries(await fs.readFile(filePath, "utf8"), options.input);
  } catch {
    return [];
  }
}

export async function discoverClaudeExternalHarnessCandidates(
  workspaceAbsolutePath: string,
  occupiedKeys: Set<string>
): Promise<ExternalHarnessArtifactCandidate[]> {
  const projectDirectoryPath = path.join(getClaudeProjectsRootPath(), buildClaudeProjectDirectoryName(workspaceAbsolutePath));
  let names: string[];
  try {
    names = (await fs.readdir(projectDirectoryPath)).filter((name) => name.endsWith(".jsonl"));
  } catch {
    return [];
  }

  const rows: ExternalHarnessArtifactCandidate[] = [];
  for (const name of names) {
    const conversationId = path.basename(name, ".jsonl");
    if (!conversationId) {
      continue;
    }
    if (occupiedKeys.has(`claude:${normalizeStoredResumeSessionId(conversationId)}`)) {
      continue;
    }
    const filePath = path.join(projectDirectoryPath, name);
    try {
      const stat = await fs.stat(filePath);
      rows.push({
        toolId: "claude",
        conversationId,
        primaryArtifactPath: filePath,
        sessionLabel: `Claude · ${conversationId.length > 18 ? `${conversationId.slice(0, 18)}…` : conversationId}`,
        lastUpdatedAt: new Date(stat.mtimeMs).toISOString()
      });
    } catch {
      // ignore
    }
  }

  return rows.sort((left, right) => (right.lastUpdatedAt || "").localeCompare(left.lastUpdatedAt || "")).slice(0, 20);
}

export const claudeHarnessContextAdapter: HarnessContextAdapter = {
  toolId: "claude",
  readEntries: (input) => readClaudeHarnessEntries({
    projectsRootPath: getClaudeProjectsRootPath(),
    input
  })
};
