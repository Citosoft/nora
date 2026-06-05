import { normalizeRecoveredTerminals } from "@main/orchestrator/projectOpen";
import type { TerminalSession } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createTerminal(overrides: Partial<TerminalSession> = {}): TerminalSession {
  return {
    id: "terminal-1",
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    name: "Terminal",
    status: "starting",
    isBusy: true,
    workspace: "/repo/project",
    currentWorkingDirectory: "/repo",
    branch: "main",
    host: "local",
    shellId: "zsh",
    shellLabel: "zsh",
    command: "",
    pid: null,
    lastEventAt: "2026-06-05T00:00:00.000Z",
    lastTerminalLine: "",
    launchConfig: {
      kind: "blank",
      command: "",
      label: "Terminal"
    },
    rawTerminalOutput: "",
    detectedLocalUrl: null,
    detectedLocalPort: null,
    changeSummary: null,
    ...overrides
  };
}

test("normalizeRecoveredTerminals preserves live cwd while keeping workspace rooted at the worktree", () => {
  const [terminal] = normalizeRecoveredTerminals(
    [createTerminal()],
    [{ id: "worktree-1", path: "/repo/project" }]
  );

  assert.equal(terminal?.workspace, "/repo/project");
  assert.equal(terminal?.currentWorkingDirectory, "/repo");
});

test("normalizeRecoveredTerminals migrates previously polluted workspace into live cwd", () => {
  const [terminal] = normalizeRecoveredTerminals(
    [createTerminal({ workspace: "/repo", currentWorkingDirectory: null })],
    [{ id: "worktree-1", path: "/repo/project" }]
  );

  assert.equal(terminal?.workspace, "/repo/project");
  assert.equal(terminal?.currentWorkingDirectory, "/repo");
});
