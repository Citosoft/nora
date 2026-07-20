import { resolveAgentSessionTitles } from "@main/orchestrator/agentSessionTitles";
import type { AgentSession } from "@shared/appTypes";
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
    name: "Codex",
    toolId: "codex",
    toolLabel: "Codex",
    status: "running",
    workspace: "/tmp/project",
    branch: "main",
    host: "local",
    task: "Inspect changes",
    command: "codex",
    pid: 123,
    lastEventAt: "2026-07-20T10:00:00.000Z",
    lastTerminalLine: "",
    resumeSessionId: "thread-1",
    resumeCommand: "codex resume thread-1",
    contextFilePath: "/tmp/project/.nora/context.md",
    terminalStreamPath: "/tmp/project/.nora/terminal.log",
    isBusy: false,
    busyUntil: null,
    terminalOutput: [],
    rawTerminalOutput: "",
    changeSummary: null,
    ...overrides
  };
}

async function writeJsonl(filePath: string, entries: unknown[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");
}

test("resolveAgentSessionTitles reads Codex thread names from the session index", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "nora-agent-title-codex-"));
  const indexPath = path.join(tempRoot, "session_index.jsonl");
  await writeJsonl(indexPath, [
    { id: "other-thread", thread_name: "Ignore this session" },
    { id: "thread-1", thread_name: "Summarize sidebar changes" }
  ]);

  const [agent] = await resolveAgentSessionTitles([createAgent()], {
    codexSessionIndexPath: indexPath
  });

  assert.equal(agent.threadTitle, "Summarize sidebar changes");
});

test("resolveAgentSessionTitles reads Claude custom titles from project transcripts", async () => {
  const configDir = await fs.mkdtemp(path.join(os.tmpdir(), "nora-agent-title-claude-"));
  const transcriptPath = path.join(configDir, "projects", "tmp-project", "claude-session-1.jsonl");
  await writeJsonl(transcriptPath, [
    {
      type: "user",
      message: {
        content: "Make the panels lighter."
      }
    },
    {
      type: "conversation-summary",
      title: "Dark mode refinement"
    },
    {
      type: "custom-title",
      title: "Sidebar polish pass"
    }
  ]);

  const [agent] = await resolveAgentSessionTitles(
    [
      createAgent({
        name: "Claude",
        toolId: "claude",
        toolLabel: "Claude",
        resumeSessionId: "claude-session-1",
        resumeCommand: "claude --resume claude-session-1"
      })
    ],
    { claudeConfigDir: configDir }
  );

  assert.equal(agent.threadTitle, "Sidebar polish pass");
});

test("resolveAgentSessionTitles falls back to the first Claude prompt when no title is stored", async () => {
  const configDir = await fs.mkdtemp(path.join(os.tmpdir(), "nora-agent-title-claude-prompt-"));
  const transcriptPath = path.join(configDir, "projects", "tmp-project", "claude-session-2.jsonl");
  await writeJsonl(transcriptPath, [
    {
      type: "user",
      message: {
        content: [{ type: "text", text: "Replace harness names with generated session titles." }]
      }
    }
  ]);

  const [agent] = await resolveAgentSessionTitles(
    [
      createAgent({
        name: "Claude",
        toolId: "claude",
        toolLabel: "Claude",
        resumeSessionId: "claude-session-2",
        resumeCommand: "claude --resume claude-session-2"
      })
    ],
    { claudeConfigDir: configDir }
  );

  assert.equal(agent.threadTitle, "Replace harness names with generated session titles.");
});

