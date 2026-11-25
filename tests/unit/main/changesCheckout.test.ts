import { createInitialState } from "@main/orchestrator/createAppInitialState";
import { getActiveChangesRoot, selectChangesCheckout } from "@main/orchestrator/changesCheckout";
import { listChangesCheckoutPaths } from "@shared/changesCheckout";
import type { AppState, ProjectSummary, TerminalSession, WorktreeRecord } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createProject(): ProjectSummary {
  return {
    id: "project-1",
    name: "Project",
    rootPath: "/repo/project",
    gitCommonDir: "/repo/project/.git",
    versionControl: "git",
    location: { kind: "local" },
    remoteAgentCatalog: null,
    workspaceInstructionFile: null,
    workspaceTerminalPresets: [],
    baseBranch: "main",
    framework: null,
    platform: "linux",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
    lastOpenedAt: "2026-06-04T00:00:00.000Z"
  };
}

function createWorktree(overrides: Partial<WorktreeRecord> = {}): WorktreeRecord {
  return {
    id: "worktree-1",
    projectId: "project-1",
    sessionId: "session-1",
    path: "/repo/project",
    location: { kind: "local" },
    branch: "main",
    createdFromRef: "ROOT",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
    lastUsedAt: "2026-06-04T00:00:00.000Z",
    status: "ready",
    readerAgentIds: [],
    terminalSessionIds: ["terminal-1"],
    scripts: [],
    ...overrides
  };
}

function createTerminal(): TerminalSession {
  return {
    id: "terminal-1",
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    name: "Terminal",
    status: "running",
    isBusy: false,
    workspace: "/repo",
    currentWorkingDirectory: "/repo",
    branch: "main",
    host: "local",
    shellId: "zsh",
    shellLabel: "zsh",
    command: "",
    pid: 123,
    lastEventAt: "2026-06-04T00:00:00.000Z",
    lastTerminalLine: "",
    launchConfig: {
      kind: "blank",
      command: "",
      label: "Terminal"
    },
    rawTerminalOutput: "",
    detectedLocalUrl: null,
    detectedLocalPort: null,
    changeSummary: null
  };
}

const loopWorktree = createWorktree({ id: "worktree-loop", sessionId: "session-loop", path: "/nora/worktrees/loop", branch: "loop/run" });

function createState(overrides: Partial<AppState> = {}): AppState {
  return { ...createInitialState(), project: createProject(), worktrees: [createWorktree(), loopWorktree], ...overrides };
}

test("getActiveChangesRoot ignores focused terminals and sessions, defaulting to the project checkout", () => {
  const state = createState({
    focusedTerminalId: "terminal-1",
    terminals: [{ ...createTerminal(), worktreeId: "worktree-loop" }],
    currentSessionId: "session-loop",
    changesRoot: null
  });

  assert.equal(getActiveChangesRoot(state), "/repo/project");
});

test("getActiveChangesRoot keeps a selected worktree and falls back once it is gone", () => {
  assert.equal(getActiveChangesRoot(createState({ changesRoot: loopWorktree.path })), loopWorktree.path);
  assert.equal(getActiveChangesRoot(createState({ changesRoot: loopWorktree.path, worktrees: [createWorktree()] })), "/repo/project");
  assert.equal(
    getActiveChangesRoot(createState({ changesRoot: loopWorktree.path, worktrees: [{ ...loopWorktree, status: "removing" }] })),
    "/repo/project"
  );
});

test("listChangesCheckoutPaths lists the project checkout once, then ready worktrees", () => {
  assert.deepEqual(listChangesCheckoutPaths(createState()), ["/repo/project", loopWorktree.path]);
  assert.deepEqual(listChangesCheckoutPaths(createState({ project: null })), []);
});

test("selectChangesCheckout switches checkout and clears selections from the previous one", () => {
  const state = createState({ changesRoot: "/repo/project", selectedChangePath: "a.ts", selectedCommitHash: "abc" });
  const next = selectChangesCheckout(state, loopWorktree.path);

  assert.equal(next.changesRoot, loopWorktree.path);
  assert.equal(next.selectedChangePath, null);
  assert.equal(next.selectedCommitHash, null);
  assert.equal(selectChangesCheckout(next, loopWorktree.path), next);
});

test("selectChangesCheckout rejects paths outside the project's checkouts", () => {
  assert.throws(() => selectChangesCheckout(createState(), "/somewhere/else"), /ready worktrees/);
});
