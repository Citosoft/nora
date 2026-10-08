import type { AgentSession } from "@shared/appTypes";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveClaudeConfigDir } from "../agent-usage/claudeConfigDir";
import { queryReadOnlySqlite } from "../helpers/readOnlySqlite";
import { buildClaudeProjectDirectoryName } from "./harness-context/claudeAdapter";
import { normalizeStoredResumeSessionId } from "./resumeCommandUtils";
import type {
  AgentSessionTitleLookupInput,
  AgentSessionTitleResolverOptions
} from "../types/agentSessionTitle.types";

const TITLE_MAX_LENGTH = 96;

const readObjectField = (value: unknown, key: string): unknown =>
  value && typeof value === "object" && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;

const readStringField = (value: unknown, keys: string[]): string | null => {
  for (const key of keys) {
    const field = readObjectField(value, key);
    if (typeof field === "string") {
      const normalized = normalizeThreadTitle(field);
      if (normalized) {
        return normalized;
      }
    }
  }
  return null;
};

const parseJsonLine = (line: string): unknown | null => {
  try {
    return JSON.parse(line) as unknown;
  } catch {
    return null;
  }
};

export const normalizeThreadTitle = (value: string): string | null => {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return null;
  }
  return collapsed.length > TITLE_MAX_LENGTH
    ? `${collapsed.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}...`
    : collapsed;
};

const readTextContent = (value: unknown): string | null => {
  if (typeof value === "string") {
    return normalizeThreadTitle(value);
  }
  if (!Array.isArray(value)) {
    return null;
  }

  const parts = value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }
      return readStringField(entry, ["text", "content"]);
    })
    .filter((entry): entry is string => !!entry);
  return normalizeThreadTitle(parts.join(" "));
};

async function readCodexThreadTitle(
  agent: AgentSessionTitleLookupInput,
  options: AgentSessionTitleResolverOptions
): Promise<string | null> {
  const resumeSessionId = normalizeStoredResumeSessionId(agent.resumeSessionId || "");
  if (!resumeSessionId) {
    return null;
  }

  const codexHome = path.join(os.homedir(), ".codex");
  const sessionIndexPath = options.codexSessionIndexPath || path.join(codexHome, "session_index.jsonl");
  const content = await fs.readFile(sessionIndexPath, "utf8").catch(() => "");
  let title: string | null = null;
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    const parsed = parseJsonLine(line);
    const id = readStringField(parsed, ["id", "thread_id", "threadId"]);
    if (id !== resumeSessionId) {
      continue;
    }
    title = readStringField(parsed, ["thread_name", "threadName", "title", "name"]) || title;
  }
  return title || readCodexSqliteThreadTitle(resumeSessionId, path.join(codexHome, "state_5.sqlite"));
}

/** Newer Codex builds keep thread titles in their state database instead of the session index. */
function readCodexSqliteThreadTitle(resumeSessionId: string, databasePath: string): string | null {
  const rows = queryReadOnlySqlite(
    databasePath,
    "SELECT title FROM threads WHERE id = ? AND title IS NOT NULL AND length(trim(title)) > 0 ORDER BY updated_at DESC LIMIT 1",
    [resumeSessionId]
  );
  const title = rows?.[0]?.title;
  return typeof title === "string" ? normalizeThreadTitle(title) : null;
}

async function readClaudeThreadTitle(
  agent: AgentSessionTitleLookupInput,
  options: AgentSessionTitleResolverOptions
): Promise<string | null> {
  const resumeSessionId = normalizeStoredResumeSessionId(agent.resumeSessionId || "");
  if (!resumeSessionId) {
    return null;
  }

  const configDir = options.claudeConfigDir || resolveClaudeConfigDir();
  const transcriptPath = path.join(
    configDir,
    "projects",
    buildClaudeProjectDirectoryName(agent.workspace),
    `${resumeSessionId}.jsonl`
  );
  const content = await fs.readFile(transcriptPath, "utf8").catch(() => "");
  let generatedTitle: string | null = null;
  let customTitle: string | null = null;
  let summary: string | null = null;
  let firstPrompt: string | null = null;

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    const parsed = parseJsonLine(line);
    const type = readStringField(parsed, ["type"]);
    const directTitle = readStringField(parsed, [
      "custom_title",
      "customTitle",
      "session_name",
      "sessionName",
      "title",
      "name"
    ]);
    if (type === "custom-title" && directTitle) {
      customTitle = directTitle;
      continue;
    }
    if ((type === "summary" || type === "conversation-summary") && directTitle) {
      summary = directTitle;
      continue;
    }
    if ((type === "agent-name" || type === "session-title") && directTitle) {
      generatedTitle = directTitle;
      continue;
    }

    summary = summary || readStringField(parsed, ["summary"]);
    generatedTitle = generatedTitle || readStringField(parsed, ["generated_title", "generatedTitle"]);

    if (type === "user" && !firstPrompt) {
      const message = readObjectField(parsed, "message");
      firstPrompt =
        readTextContent(readObjectField(message, "content")) ||
        readTextContent(readObjectField(parsed, "content")) ||
        readStringField(parsed, ["prompt", "last_prompt", "lastPrompt"]);
    }
  }

  return customTitle || generatedTitle || summary || firstPrompt;
}

export async function resolveAgentSessionTitle(
  agent: AgentSessionTitleLookupInput,
  options: AgentSessionTitleResolverOptions = {}
): Promise<string | null> {
  if (agent.toolId === "codex") {
    return readCodexThreadTitle(agent, options);
  }
  if (agent.toolId === "claude") {
    return readClaudeThreadTitle(agent, options);
  }
  return null;
}

export async function resolveAgentSessionTitles(
  agents: AgentSession[],
  options: AgentSessionTitleResolverOptions = {}
): Promise<AgentSession[]> {
  const resolvedTitleByKey = new Map<string, string | null>();

  return Promise.all(
    agents.map(async (agent) => {
      const resumeSessionId = normalizeStoredResumeSessionId(agent.resumeSessionId || "");
      if (!resumeSessionId || (agent.toolId !== "codex" && agent.toolId !== "claude")) {
        return {
          ...agent,
          threadTitle: agent.threadTitle ?? null
        };
      }

      const cacheKey = `${agent.toolId}\0${agent.workspace}\0${resumeSessionId}`;
      if (!resolvedTitleByKey.has(cacheKey)) {
        resolvedTitleByKey.set(cacheKey, await resolveAgentSessionTitle(agent, options).catch(() => null));
      }

      const nextTitle = resolvedTitleByKey.get(cacheKey) || agent.threadTitle || null;
      return {
        ...agent,
        threadTitle: nextTitle
      };
    })
  );
}
