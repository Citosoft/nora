import { buildAgentContextSourceSummary } from "@main/orchestrator/agentContextArtifacts";
import type { AgentContextEntry, AgentSession } from "@shared/appTypes";
import assert from "node:assert/strict";
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

function createEntry(overrides: Partial<AgentContextEntry>): AgentContextEntry {
  return {
    id: "entry-1",
    agentId: "agent-1",
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    createdAt: "2026-04-29T10:00:00.000Z",
    kind: "agent-output",
    precision: "exact",
    source: "harness",
    title: "Codex output",
    content: "Example content",
    preview: "Example content",
    estimate: {
      characters: 15,
      estimatedTokens: 4
    },
    references: [],
    sourceAgentIds: [],
    ...overrides
  };
}

test("buildAgentContextSourceSummary groups related exact and harness entries into selectable conversation blocks", () => {
  const agent = createAgent();
  const entries: AgentContextEntry[] = [
    createEntry({
      id: "entry-launch",
      createdAt: "2026-04-29T10:00:00.000Z",
      kind: "launch",
      source: "dialog",
      title: "Agent launch details",
      content: "Launch details",
      preview: "Launch details",
      estimate: { characters: 14, estimatedTokens: 4 }
    }),
    createEntry({
      id: "entry-harness-1",
      createdAt: "2026-04-29T10:00:05.000Z",
      conversationId: "codex-thread-1",
      content: "First session output",
      preview: "First session output",
      estimate: { characters: 20, estimatedTokens: 5 }
    }),
    createEntry({
      id: "entry-prompt",
      createdAt: "2026-04-29T10:00:06.000Z",
      kind: "user-prompt",
      source: "composer",
      title: "Prompt sent to agent",
      content: "Follow the first session",
      preview: "Follow the first session",
      estimate: { characters: 24, estimatedTokens: 6 }
    }),
    createEntry({
      id: "entry-harness-2",
      createdAt: "2026-04-29T10:10:00.000Z",
      conversationId: "codex-thread-2",
      content: "Second session output",
      preview: "Second session output",
      estimate: { characters: 21, estimatedTokens: 6 }
    })
  ];

  const summary = buildAgentContextSourceSummary(agent, entries);

  assert.equal(summary.toolId, "codex");
  assert.equal(summary.entryGroups.length, 2);
  assert.equal(summary.entryGroups[0]?.id, "codex:codex-thread-2");
  assert.deepEqual(summary.entryGroups[0]?.entryIds, ["entry-harness-2"]);
  assert.equal(summary.entryGroups[1]?.id, "codex:codex-thread-1");
  assert.deepEqual(summary.entryGroups[1]?.entryIds, ["entry-launch", "entry-harness-1", "entry-prompt"]);
});
