import { createInitialState } from "@main/orchestrator/createAppInitialState";
import { getActiveChangesRoot } from "@main/orchestrator/sessionActions";
import type { AppState, ProjectSummary, TerminalSession, WorktreeRecord } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createProject(): ProjectSummary {
  return {
    id: "project-1",
    name: "Project",
    rootPath: "/repo/project",
    gitCommonDir: "/repo/project/.git",
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

function createWorktree(): WorktreeRecord {
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
    writerAgentId: null,
    readerAgentIds: [],
    terminalSessionIds: ["terminal-1"],
    scripts: []
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

test("getActiveChangesRoot uses a focused terminal's attached worktree path instead of terminal cwd", () => {
  const state: AppState = {
    ...createInitialState(),
    project: createProject(),
    focusedTerminalId: "terminal-1",
    worktrees: [createWorktree()],
    terminals: [createTerminal()]
  };

  assert.equal(getActiveChangesRoot(state), "/repo/project");
});
