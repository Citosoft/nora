import { createInitialState } from "@main/orchestrator/createAppInitialState";
import { sendTerminalInput } from "@main/orchestrator/agentTerminalActions";
import type { AgentSession, AppState, TerminalSession } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createTerminal(): TerminalSession {
  return {
    id: "terminal-1",
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    name: "Terminal",
    status: "running",
    isBusy: false,
    workspace: "/repo/project",
    currentWorkingDirectory: "/repo/project",
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

test("sendTerminalInput updates live cwd without changing the terminal workspace root", async () => {
  let state: AppState = {
    ...createInitialState(),
    terminals: [createTerminal()]
  };
  let writtenInput = "";
  const deps: Parameters<typeof sendTerminalInput>[0] = {
    nowIso: () => "2026-06-04T00:00:01.000Z",
    getSnapshot: () => state,
    getPtySession: () => ({
      write: (input) => {
        writtenInput += input;
      }
    }),
    getContextWriteChain: () => null,
    setContextWriteChain: () => undefined,
    setTerminalBuffer: () => undefined,
    deleteTerminalActivity: () => undefined,
    updateAgent: () => undefined,
    updateTerminal: (terminalId, partial) => {
      state = {
        ...state,
        terminals: state.terminals.map((terminal) =>
          terminal.id === terminalId ? { ...terminal, ...partial } : terminal
        )
      };
    },
    resetTerminalTranscript: async () => undefined,
    clearAgentContextFile: async (_agent: AgentSession) => undefined
  };

  await sendTerminalInput(deps, "terminal-1", "cd ..\r");

  const terminal = state.terminals[0];
  assert.equal(writtenInput, "cd ..\r");
  assert.equal(terminal?.workspace, "/repo/project");
  assert.equal(terminal?.currentWorkingDirectory, "/repo");
});
