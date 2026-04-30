import { applyStateDelta } from "@/components/app/logic/appUtils";
import type { AgentSession, AppState, AppStateDelta, TerminalSession, WorkspaceSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createAgent(id: string, name: string): AgentSession {
  return {
    id,
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    mode: "write",
    name,
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
    rawTerminalOutput: "",
    changeSummary: null
  };
}

function createTerminal(id: string, name: string): TerminalSession {
  return {
    id,
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    name,
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
    launchConfig: {
      kind: "blank",
      label: "Shell",
      command: ""
    },
    rawTerminalOutput: "",
    detectedLocalUrl: null,
    detectedLocalPort: null,
    changeSummary: null
  };
}

function createSnapshot(): AppState {
  const agent = createAgent("agent-1", "Agent 1");
  const terminal = createTerminal("terminal-1", "Terminal 1");
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

test("applyStateDelta patches agent/terminal values across root and workspace arrays", () => {
  const snapshot = createSnapshot();
  const updatedAgent = {
    ...snapshot.agents[0],
    lastTerminalLine: "updated line"
  };
  const updatedTerminal = {
    ...snapshot.terminals[0],
    detectedLocalPort: 3000
  };
  const delta: AppStateDelta = {
    changedAgents: [updatedAgent],
    changedTerminals: [updatedTerminal],
    focusedAgentId: updatedAgent.id,
    focusedTerminalId: null,
    errorMessage: "x"
  };

  const next = applyStateDelta(snapshot, delta);
  assert.ok(next);
  assert.equal(next.agents[0].lastTerminalLine, "updated line");
  assert.equal(next.terminals[0].detectedLocalPort, 3000);
  assert.equal(next.workspaces[0].agents[0].lastTerminalLine, "updated line");
  assert.equal(next.workspaces[0].terminals[0].detectedLocalPort, 3000);
  assert.equal(next.focusedAgentId, updatedAgent.id);
  assert.equal(next.errorMessage, "x");
});

test("applyStateDelta returns null when delta references unknown sessions", () => {
  const snapshot = createSnapshot();
  const delta: AppStateDelta = {
    changedAgents: [{ ...snapshot.agents[0], id: "missing-agent" }],
    changedTerminals: [],
    focusedAgentId: null,
    focusedTerminalId: null,
    errorMessage: null
  };

  assert.equal(applyStateDelta(snapshot, delta), null);
});
