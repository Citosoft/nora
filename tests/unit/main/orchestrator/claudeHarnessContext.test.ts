import {
  buildClaudeProjectDirectoryName,
  readClaudeHarnessEntries
} from "@main/orchestrator/harness-context/claudeAdapter";
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
    name: "Claude Agent",
    toolId: "claude",
    toolLabel: "Claude Code",
    status: "running",
    workspace: "/tmp/workspace-a",
    branch: "main",
    host: "local",
    task: "Investigate failures",
    command: "claude",
    pid: 123,
    lastEventAt: "2026-04-29T10:00:00.000Z",
    lastTerminalLine: "",
    resumeSessionId: null,
    resumeCommand: null,
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

test("buildClaudeProjectDirectoryName mirrors Claude's workspace directory naming", () => {
  assert.equal(buildClaudeProjectDirectoryName("/home/daniel/dev/claudetest"), "-home-daniel-dev-claudetest");
});

test("readClaudeHarnessEntries normalizes Claude session files and skips duplicate exact prompts", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "nora-claude-context-"));
  const agent = createAgent({
    workspace: "/tmp/workspace-a"
  });
  const projectDirectoryPath = path.join(tempRoot, buildClaudeProjectDirectoryName(agent.workspace));
  await fs.mkdir(projectDirectoryPath, { recursive: true });
  await fs.writeFile(
    path.join(projectDirectoryPath, "session-a.jsonl"),
    [
      JSON.stringify({
        type: "user",
        cwd: agent.workspace,
        sessionId: "claude-session-1",
        timestamp: "2026-04-29T10:00:01.000Z",
        message: {
          role: "user",
          content: "Compile the latest summary."
        }
      }),
      JSON.stringify({
        type: "assistant",
        cwd: agent.workspace,
        sessionId: "claude-session-1",
        timestamp: "2026-04-29T10:00:02.000Z",
        message: {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "internal reasoning" },
            { type: "text", text: "I checked the repo and summarized the latest changes." }
          ]
        }
      }),
      JSON.stringify({
        type: "user",
        cwd: agent.workspace,
        sessionId: "claude-session-1",
        timestamp: "2026-04-29T10:00:03.000Z",
        message: {
          role: "user",
          content: [{ type: "tool_result", content: "ignored tool result" }]
        }
      }),
      JSON.stringify({
        type: "user",
        cwd: agent.workspace,
        sessionId: "claude-session-1",
        timestamp: "2026-04-29T10:00:04.000Z",
        message: {
          role: "user",
          content: "Use the terminal path directly."
        }
      })
    ].join("\n"),
    "utf8"
  );

  const entries = await readClaudeHarnessEntries({
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
