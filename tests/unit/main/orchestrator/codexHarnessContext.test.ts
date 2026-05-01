import { readCodexHarnessEntries } from "@main/orchestrator/harness-context/codexAdapter";
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
    name: "Codex Agent",
    toolId: "codex",
    toolLabel: "Codex",
    status: "running",
    workspace: "/tmp/workspace-a",
    branch: "main",
    host: "local",
    task: "Investigate failures",
    command: "codex --no-alt-screen",
    pid: 123,
    lastEventAt: "2026-04-29T10:00:00.000Z",
    lastTerminalLine: "",
    resumeSessionId: "codex-thread-1",
    resumeCommand: "codex resume codex-thread-1",
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

async function writeRolloutFile(filePath: string, lines: unknown[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`,
    "utf8"
  );
}

test("readCodexHarnessEntries prefers the resume session rollout and keeps only user and agent messages", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "nora-codex-context-"));
  const agent = createAgent();
  await writeRolloutFile(
    path.join(tempRoot, "2026", "04", "29", "rollout-2026-04-29T10-00-00-codex-thread-1.jsonl"),
    [
      {
        timestamp: "2026-04-29T10:00:00.000Z",
        type: "session_meta",
        payload: {
          id: "codex-thread-1",
          timestamp: "2026-04-29T10:00:00.000Z",
          cwd: agent.workspace
        }
      },
      {
        timestamp: "2026-04-29T10:00:01.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "developer",
          content: [{ type: "input_text", text: "internal instructions" }]
        }
      },
      {
        timestamp: "2026-04-29T10:00:02.000Z",
        type: "event_msg",
        payload: {
          type: "user_message",
          message: "Compile the latest summary."
        }
      },
      {
        timestamp: "2026-04-29T10:00:03.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "I checked the repo and summarized the latest changes.",
          phase: "commentary"
        }
      },
      {
        timestamp: "2026-04-29T10:00:03.500Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "duplicate assistant message" }]
        }
      },
      {
        timestamp: "2026-04-29T10:00:04.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: "{\"cmd\":\"pwd\"}"
        }
      },
      {
        timestamp: "2026-04-29T10:00:05.000Z",
        type: "event_msg",
        payload: {
          type: "user_message",
          message: "Use the terminal path directly."
        }
      },
      {
        timestamp: "2026-04-29T10:00:06.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "Final answer.",
          phase: "final"
        }
      }
    ]
  );

  const entries = await readCodexHarnessEntries({
    sessionsRootPath: tempRoot,
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
      },
      {
        kind: "agent-output",
        source: "harness",
        content: "Final answer."
      }
    ]
  );
});

test("readCodexHarnessEntries falls back to the newest matching workspace rollout after the context boundary", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "nora-codex-context-fallback-"));
  const agent = createAgent({
    resumeSessionId: null,
    resumeCommand: null
  });

  await writeRolloutFile(
    path.join(tempRoot, "2026", "04", "28", "rollout-2026-04-28T10-00-00-other-thread.jsonl"),
    [
      {
        timestamp: "2026-04-28T10:00:00.000Z",
        type: "session_meta",
        payload: {
          id: "other-thread",
          timestamp: "2026-04-28T10:00:00.000Z",
          cwd: agent.workspace
        }
      },
      {
        timestamp: "2026-04-28T10:00:01.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "Too old."
        }
      }
    ]
  );

  await writeRolloutFile(
    path.join(tempRoot, "2026", "04", "29", "rollout-2026-04-29T10-05-00-wrong-workspace.jsonl"),
    [
      {
        timestamp: "2026-04-29T10:05:00.000Z",
        type: "session_meta",
        payload: {
          id: "wrong-workspace",
          timestamp: "2026-04-29T10:05:00.000Z",
          cwd: "/tmp/workspace-b"
        }
      },
      {
        timestamp: "2026-04-29T10:05:01.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "Wrong workspace."
        }
      }
    ]
  );

  await writeRolloutFile(
    path.join(tempRoot, "2026", "04", "29", "rollout-2026-04-29T10-10-00-matching-thread.jsonl"),
    [
      {
        timestamp: "2026-04-29T10:10:00.000Z",
        type: "session_meta",
        payload: {
          id: "matching-thread",
          timestamp: "2026-04-29T10:10:00.000Z",
          cwd: agent.workspace
        }
      },
      {
        timestamp: "2026-04-29T10:10:01.000Z",
        type: "event_msg",
        payload: {
          type: "agent_message",
          message: "Newest matching rollout."
        }
      }
    ]
  );

  const entries = await readCodexHarnessEntries({
    sessionsRootPath: tempRoot,
    input: {
      agent,
      exactEntries: [],
      contextBoundaryMs: Date.parse("2026-04-29T10:00:00.000Z")
    }
  });

  assert.deepEqual(
    entries.map((entry) => entry.content),
    ["Newest matching rollout."]
  );
});
