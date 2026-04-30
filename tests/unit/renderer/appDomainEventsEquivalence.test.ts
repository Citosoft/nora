import { applyAppDomainEvents } from "@/components/app/logic/applyAppDomainEvents";
import { canonicalizeAppStateFromMain } from "@/components/app/logic/canonicalizeAppState";
import { hydrateAppDomainState } from "@/components/app/logic/hydrateAppDomainState";
import { applyStateDelta } from "@/components/app/logic/appUtils";
import { deriveAppDomainEvents } from "@main/helpers/deriveAppDomainEvents";
import type { AgentSession, AppState, AppStateDelta, TerminalSession, WorkspaceSummary } from "@shared/appTypes";
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

function assertEventsRoundTripToHydrate(previous: AppState, next: AppState): void {
  const events = deriveAppDomainEvents(previous, next);
  const fromEvents = applyAppDomainEvents(hydrateAppDomainState(previous), events);
  assert.deepEqual(fromEvents, hydrateAppDomainState(next));
}

test("domain events fold equals hydrate for stable agent/terminal delta", () => {
  const previous = createSnapshot();
  const updatedAgent = { ...previous.agents[0], lastTerminalLine: "next" };
  const updatedTerminal = { ...previous.terminals[0], detectedLocalPort: 4000 };
  const delta: AppStateDelta = {
    changedAgents: [{ ...updatedAgent, rawTerminalOutput: "" }],
    changedTerminals: [{ ...updatedTerminal, rawTerminalOutput: "" }],
    focusedAgentId: updatedAgent.id,
    focusedTerminalId: null,
    errorMessage: "e"
  };
  const next = applyStateDelta(previous, delta);
  assert.ok(next);
  assertEventsRoundTripToHydrate(previous, next);
});

test("domain events fold equals hydrate for focus-only change", () => {
  const previous = createSnapshot();
  const next: AppState = { ...previous, focusedAgentId: "agent-1" };
  assertEventsRoundTripToHydrate(previous, next);
});

test("domain events fold equals hydrate for topology break", () => {
  const previous = createSnapshot();
  const next: AppState = {
    ...previous,
    agents: [...previous.agents, createAgent("agent-2")]
  };
  assertEventsRoundTripToHydrate(previous, next);
});

test("canonicalizeAppStateFromMain is idempotent", () => {
  const s = createSnapshot();
  const once = canonicalizeAppStateFromMain(s);
  assert.deepEqual(canonicalizeAppStateFromMain(once), once);
});
