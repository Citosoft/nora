import {
  buildCursorProjectDirectoryName,
  readCursorHarnessEntries
} from "@main/orchestrator/harness-context/cursorAdapter";
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
    name: "Cursor Agent",
    toolId: "cursor",
    toolLabel: "Cursor Agent",
    status: "running",
    workspace: "/tmp/workspace-a",
    branch: "main",
    host: "local",
    task: "Investigate failures",
    command: "cursor-agent",
    pid: 123,
    lastEventAt: "2026-04-29T10:00:00.000Z",
    lastTerminalLine: "",
    resumeSessionId: "cursor-session-1",
    resumeCommand: "agent --resume=cursor-session-1",
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

async function writeCursorTranscriptFile(filePath: string, lines: unknown[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`, "utf8");
}

test("buildCursorProjectDirectoryName mirrors Cursor's workspace directory naming", () => {
  assert.equal(buildCursorProjectDirectoryName("/home/daniel/dev/personal/nora"), "home-daniel-dev-personal-nora");
});

test("readCursorHarnessEntries prefers the resume transcript and extracts only visible text blocks", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "nora-cursor-context-"));
  const agent = createAgent();
  await writeCursorTranscriptFile(
    path.join(
      tempRoot,
      buildCursorProjectDirectoryName(agent.workspace),
      "agent-transcripts",
      "cursor-session-1",
      "cursor-session-1.jsonl"
    ),
    [
      {
        role: "user",
        message: {
          content: [{ type: "text", text: "Compile the latest summary." }]
        }
      },
      {
        role: "assistant",
        message: {
          content: [
            { type: "text", text: "I checked the repo and summarized the latest changes." },
            { type: "tool_use", name: "rg", input: { pattern: "ignored" } }
          ]
        }
      },
      {
        role: "user",
        message: {
          content: [{ type: "text", text: "Use the terminal path directly." }]
        }
      }
    ]
  );

  const entries = await readCursorHarnessEntries({
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
