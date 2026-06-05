import {
  formatTerminalWorkspaceSessionTabName,
  getWorkspaceSessionTabs
} from "@/components/app/logic/workspaceSessionTabs";
import type { TerminalSession, WorkspaceSummary } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

test("formatTerminalWorkspaceSessionTabName includes the terminal working directory basename", () => {
  assert.equal(
    formatTerminalWorkspaceSessionTabName("Terminal", "/Users/daniel/dev/nora-oss"),
    "Terminal · nora-oss"
  );
});

test("formatTerminalWorkspaceSessionTabName handles trailing and Windows path separators", () => {
  assert.equal(
    formatTerminalWorkspaceSessionTabName("Terminal", "C:\\Users\\daniel\\repo\\"),
    "Terminal · repo"
  );
});

test("formatTerminalWorkspaceSessionTabName falls back to the terminal name without a working directory", () => {
  assert.equal(formatTerminalWorkspaceSessionTabName("Terminal", "  "), "Terminal");
});

test("getWorkspaceSessionTabs uses terminal currentWorkingDirectory for terminal tab labels", () => {
  const terminal: TerminalSession = {
    id: "terminal-1",
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    name: "Terminal",
    status: "running",
    isBusy: false,
    workspace: "/repo/project",
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
  const workspace: WorkspaceSummary = {
    project: {
      id: "project-1",
      name: "Project",
      rootPath: "/repo/project",
      gitCommonDir: "/repo/project/.git",
      baseBranch: "main",
      platform: "unknown",
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
      lastOpenedAt: "2026-06-04T00:00:00.000Z",
      framework: null,
      location: { kind: "local" },
      remoteAgentCatalog: null,
      workspaceInstructionFile: null,
      workspaceTerminalPresets: []
    },
    sessions: [],
    worktrees: [],
    agents: [],
    terminals: [terminal]
  };

  const tabs = getWorkspaceSessionTabs(workspace, [], [], [], [], [], null);

  assert.equal(tabs[0]?.name, "Terminal · repo");
});
