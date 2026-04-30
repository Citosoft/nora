import type { AgentContextEntry } from "@shared/appTypes";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { GeminiSessionFile, GeminiSessionMessage } from "../../types/harness-context/gemini.types";
import type { HarnessContextAdapter, HarnessContextReadInput } from "../../types/harnessContext.types";
import { normalizeStoredResumeSessionId } from "../resumeCommandUtils";
import {
  buildHarnessContextEntry,
  hasExactUserPromptDuplicate,
  parseIsoTimestamp
} from "./contextEntryFactory";

const GEMINI_SESSION_MATCH_SKEW_MS = 5 * 60_000;

function getGeminiProjectsRootPath(): string {
  return path.join(os.homedir(), ".gemini", "tmp");
}

export function buildGeminiProjectHash(workspacePath: string): string {
  return createHash("sha256").update(workspacePath).digest("hex");
}

function isGeminiSessionMessageList(value: unknown): value is GeminiSessionMessage[] {
  return Array.isArray(value);
}

function parseGeminiSessionFile(raw: string): GeminiSessionFile | null {
  try {
    return JSON.parse(raw) as GeminiSessionFile;
  } catch {
    return null;
  }
}

function collectGeminiMessageText(message: GeminiSessionMessage): string {
  return typeof message.content === "string" ? message.content.trim() : "";
}

async function chooseGeminiSessionFilePath(
  input: HarnessContextReadInput,
  projectsRootPath: string
): Promise<string | null> {
  const chatsDirectoryPath = path.join(projectsRootPath, buildGeminiProjectHash(input.agent.workspace), "chats");

  let fileNames: string[];
  try {
    fileNames = (await fs.readdir(chatsDirectoryPath))
      .filter((fileName) => fileName.startsWith("session-") && fileName.endsWith(".json"));
  } catch {
    return null;
  }

  if (fileNames.length === 0) {
    return null;
  }

  const resumeSessionId = normalizeStoredResumeSessionId(input.agent.resumeSessionId || "");
  const candidates = await Promise.all(
    fileNames.map(async (fileName) => {
      const filePath = path.join(chatsDirectoryPath, fileName);
      try {
        const [raw, stat] = await Promise.all([
          fs.readFile(filePath, "utf8"),
          fs.stat(filePath)
        ]);
        const sessionFile = parseGeminiSessionFile(raw);
        if (!sessionFile) {
          return null;
        }

        return {
          filePath,
          sessionFile,
          modifiedAtMs: stat.mtimeMs
        };
      } catch {
        return null;
      }
    })
  );

  const concreteCandidates = candidates.flatMap((candidate) => (candidate ? [candidate] : []));
  if (resumeSessionId) {
    const exactMatch = concreteCandidates.find((candidate) => candidate.sessionFile.sessionId === resumeSessionId);
    if (exactMatch) {
      return exactMatch.filePath;
    }
  }

  const newestCandidate = concreteCandidates
    .filter((candidate) => {
      const boundaryCandidateMs =
        parseIsoTimestamp(candidate.sessionFile.lastUpdated) ??
        parseIsoTimestamp(candidate.sessionFile.startTime) ??
        candidate.modifiedAtMs;
      return boundaryCandidateMs >= input.contextBoundaryMs - GEMINI_SESSION_MATCH_SKEW_MS;
    })
    .sort((left, right) => {
      const leftTimestamp =
        parseIsoTimestamp(left.sessionFile.lastUpdated) ??
        parseIsoTimestamp(left.sessionFile.startTime) ??
        left.modifiedAtMs;
      const rightTimestamp =
        parseIsoTimestamp(right.sessionFile.lastUpdated) ??
        parseIsoTimestamp(right.sessionFile.startTime) ??
        right.modifiedAtMs;
      return rightTimestamp - leftTimestamp;
    })[0];

  return newestCandidate?.filePath || null;
}

function parseGeminiHarnessEntries(
  raw: string,
  input: HarnessContextReadInput
): AgentContextEntry[] {
  const sessionFile = parseGeminiSessionFile(raw);
  if (!sessionFile || !isGeminiSessionMessageList(sessionFile.messages)) {
    return [];
  }

  const sessionId = typeof sessionFile.sessionId === "string" && sessionFile.sessionId.trim().length > 0
    ? sessionFile.sessionId
    : "unknown";

  return sessionFile.messages.flatMap((message, index) => {
    const createdAtMs = parseIsoTimestamp(message.timestamp);
    if (createdAtMs === null || createdAtMs < input.contextBoundaryMs) {
      return [];
    }

    const messageType = typeof message.type === "string" ? message.type : "";
    const content = collectGeminiMessageText(message);
    if (!content) {
      return [];
    }

    if (messageType === "user") {
      if (hasExactUserPromptDuplicate(input.exactEntries, content)) {
        return [];
      }

      return [buildHarnessContextEntry({
        adapterKey: "gemini",
        agent: input.agent,
        uniqueSuffix: `${sessionId}-${index}`,
        createdAt: new Date(createdAtMs).toISOString(),
        kind: "user-prompt",
        title: "Prompt sent to agent",
        content,
        conversationId: sessionId
      })];
    }

    if (messageType === "gemini") {
      return [buildHarnessContextEntry({
        adapterKey: "gemini",
        agent: input.agent,
        uniqueSuffix: `${sessionId}-${index}`,
        createdAt: new Date(createdAtMs).toISOString(),
        kind: "agent-output",
        title: `${input.agent.name} output`,
        content,
        conversationId: sessionId
      })];
    }

    return [];
  });
}

export async function readGeminiHarnessEntries(options: {
  projectsRootPath: string;
  input: HarnessContextReadInput;
}): Promise<AgentContextEntry[]> {
  const filePath = await chooseGeminiSessionFilePath(options.input, options.projectsRootPath);
  if (!filePath) {
    return [];
  }

  try {
    return parseGeminiHarnessEntries(await fs.readFile(filePath, "utf8"), options.input);
  } catch {
    return [];
  }
}

export const geminiHarnessContextAdapter: HarnessContextAdapter = {
  toolId: "gemini",
  readEntries: (input) => readGeminiHarnessEntries({
    projectsRootPath: getGeminiProjectsRootPath(),
    input
  })
};
