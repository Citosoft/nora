import { deriveAppDomainEvents } from "@main/helpers/deriveAppDomainEvents";
import type { AgentSession, AppState, TerminalSession, WorkspaceSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createAgent(id: string): AgentSession {
  return {
    id,
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    mode: "write",
    name: "Agent",
    toolId: "codex",
    toolLabel: "Codex",
    status: "running",
    workspace: "/tmp/project",
    branch: "main",
    host: "local",
    task: "task",
    command: "codex",
    pid: 123,
    lastEventAt: "2026-04-12T00:00:00.000Z",
    lastTerminalLine: "old",
    resumeSessionId: null,
    resumeCommand: null,
    contextFilePath: "/tmp/project/.nora/context.md",
    terminalStreamPath: "/tmp/project/.nora/terminal.log",
    isBusy: false,
    busyUntil: null,
    terminalOutput: [],
    rawTerminalOutput: "stream",
    changeSummary: null
  };
}

function createTerminal(id: string): TerminalSession {
  return {
    id,
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    name: "Term",
    status: "running",
    isBusy: false,
    workspace: "/tmp/project",
    branch: "main",
    host: "local",
    shellId: "bash",
    shellLabel: "Bash",
    command: "bash",
    pid: 456,
    lastEventAt: "2026-04-12T00:00:00.000Z",
    lastTerminalLine: "old",
    launchConfig: { kind: "blank", label: "Shell", command: "" },
    rawTerminalOutput: "tstream",
    detectedLocalUrl: null,
    detectedLocalPort: null,
    changeSummary: null
  };
}

function createSnapshot(): AppState {
  const agent = createAgent("agent-1");
  const terminal = createTerminal("terminal-1");
  const workspace: WorkspaceSummary = {
    project: {
      id: "project-1",
      name: "project",
      rootPath: "/tmp/project",
      gitCommonDir: "/tmp/project/.git",
      location: undefined,
      remoteAgentCatalog: null,
      workspaceInstructionFile: null,
      workspaceTerminalPresets: [],
      baseBranch: "main",
      framework: null,
      platform: "linux",
      createdAt: "2026-04-12T00:00:00.000Z",
      updatedAt: "2026-04-12T00:00:00.000Z",
      lastOpenedAt: "2026-04-12T00:00:00.000Z"
    },
    sessions: [],
    worktrees: [],
    agents: [agent],
    terminals: [terminal]
  };

  return {
    screen: "workspace",
    project: workspace.project,
    projectBranches: ["main"],
    currentSessionId: "session-1",
    sessions: [],
    worktrees: [],
    workspaces: [workspace],
    recentProjects: [],
    focusedAgentId: null,
    focusedTerminalId: null,
    selectedChangePath: null,
    selectedCommitHash: null,
    selectedCommit: null,
    changesRoot: null,
    changes: [],
    commitHistory: [],
    activeRemoteMounts: [],
    projectScripts: [],
    defaultWorktreePrepareCommand: null,
    agents: [agent],
    terminals: [terminal],
    terminalShells: [],
    agentCatalog: [],
    agentSkillCatalogs: [],
    errorMessage: null
  };
}

test("deriveAppDomainEvents returns no events when previous snapshot is absent", () => {
  const next = createSnapshot();
  assert.deepEqual(deriveAppDomainEvents(null, next), []);
});

test("deriveAppDomainEvents emits agent.patch with compacted terminal stream payload", () => {
  const previous = createSnapshot();
  const next: AppState = {
    ...previous,
    agents: [{ ...previous.agents[0], lastTerminalLine: "new line" }]
  };

  const events = deriveAppDomainEvents(previous, next);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.kind, "agent.patch");
  if (events[0]?.kind === "agent.patch") {
    assert.equal(events[0].agents.length, 1);
    assert.equal(events[0].agents[0]?.lastTerminalLine, "new line");
    assert.equal(events[0].agents[0]?.rawTerminalOutput, "");
  }
});

test("deriveAppDomainEvents emits topology and coarse domain models when structure is unstable", () => {
  const previous = createSnapshot();
  const next: AppState = {
    ...previous,
    agents: [...previous.agents, createAgent("agent-2")]
  };

  const events = deriveAppDomainEvents(previous, next);
  const kinds = events.map((e) => e.kind);
  assert.deepEqual(kinds, [
    "workspace.topology",
    "workspace.model",
    "git.model",
    "tooling.model",
    "remotes.model",
    "scripts.model",
    "agent.model",
    "terminal.model"
  ]);
});

test("deriveAppDomainEvents emits app.focus when focus ids change", () => {
  const previous = createSnapshot();
  const next: AppState = {
    ...previous,
    focusedAgentId: "agent-1"
  };

  const events = deriveAppDomainEvents(previous, next);
  assert.deepEqual(events, [
    {
      kind: "app.focus",
      focusedAgentId: "agent-1",
      focusedTerminalId: null
    }
  ]);
});
