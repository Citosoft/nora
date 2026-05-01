import {
  buildGeminiProjectHash,
  readGeminiHarnessEntries
} from "@main/orchestrator/harness-context/geminiAdapter";
import type { AgentContextEntry, AgentSession } from "@shared/appTypes";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

function createAgent(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: "agent-1",
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    mode: "write",
    name: "Gemini Agent",
    toolId: "gemini",
    toolLabel: "Gemini CLI",
    status: "running",
    workspace: "/tmp/workspace-a",
    branch: "main",
    host: "local",
    task: "Investigate failures",
    command: "gemini",
    pid: 123,
    lastEventAt: "2026-04-29T10:00:00.000Z",
    lastTerminalLine: "",
    resumeSessionId: "gemini-session-1",
    resumeCommand: "gemini --resume gemini-session-1",
    contextFilePath: "/tmp/workspace-a/.nora/context.md",
    terminalStreamPath: "/tmp/workspace-a/.nora/terminal.log",
    isBusy: false,
    busyUntil: null,
    terminalOutput: [],
    rawTerminalOutput: "",
    changeSummary: null,
    ...overrides
  };
}

function createExactUserPromptEntry(agent: AgentSession, content: string): AgentContextEntry {
  return {
    id: `${agent.id}-prompt-1`,
    agentId: agent.id,
    projectId: agent.projectId,
    sessionId: agent.sessionId,
    worktreeId: agent.worktreeId,
    createdAt: "2026-04-29T10:00:00.000Z",
    kind: "user-prompt",
    precision: "exact",
    source: "composer",
    title: "Prompt sent to agent",
    content,
    preview: content,
    estimate: {
      characters: content.length,
      estimatedTokens: Math.ceil(content.length / 4)
    },
    references: [],
    sourceAgentIds: []
  };
}

async function writeGeminiSessionFile(filePath: string, contents: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(contents, null, 2)}\n`, "utf8");
}

test("buildGeminiProjectHash matches Gemini's workspace hashing", () => {
  assert.equal(
    buildGeminiProjectHash("/home/daniel/dev/personal/nora"),
    "12d27002b5a5d685bdfc255f9824d1262a039f3503d542e0ab87260b560638f7"
  );
});

test("readGeminiHarnessEntries prefers the resume session file and keeps only user and gemini messages", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "nora-gemini-context-"));
  const agent = createAgent();
  await writeGeminiSessionFile(
    path.join(
      tempRoot,
      buildGeminiProjectHash(agent.workspace),
      "chats",
      "session-2026-04-29T10-00-gemini-session-1.json"
    ),
    {
      sessionId: "gemini-session-1",
      projectHash: buildGeminiProjectHash(agent.workspace),
      startTime: "2026-04-29T10:00:00.000Z",
      lastUpdated: "2026-04-29T10:00:06.000Z",
      messages: [
        {
          id: "msg-1",
          timestamp: "2026-04-29T10:00:01.000Z",
          type: "user",
          content: "Compile the latest summary."
        },
        {
          id: "msg-2",
          timestamp: "2026-04-29T10:00:02.000Z",
          type: "gemini",
          content: "I checked the repo and summarized the latest changes."
        },
        {
          id: "msg-3",
          timestamp: "2026-04-29T10:00:03.000Z",
          type: "error",
          content: "ignore this"
        },
        {
          id: "msg-4",
          timestamp: "2026-04-29T10:00:04.000Z",
          type: "user",
          content: "Use the terminal path directly."
        }
      ]
    }
  );

  const entries = await readGeminiHarnessEntries({
    projectsRootPath: tempRoot,
    input: {
      agent,
      exactEntries: [createExactUserPromptEntry(agent, "Compile the latest summary.")],
      contextBoundaryMs: Date.parse("2026-04-29T10:00:00.000Z")
    }
  });

  assert.deepEqual(
    entries.map((entry) => ({
      kind: entry.kind,
      source: entry.source,
      content: entry.content
    })),
    [
      {
        kind: "agent-output",
        source: "harness",
        content: "I checked the repo and summarized the latest changes."
      },
      {
        kind: "user-prompt",
        source: "harness",
        content: "Use the terminal path directly."
      }
    ]
  );
});
