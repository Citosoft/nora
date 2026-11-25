import assert from "node:assert/strict";
import test from "node:test";
import { createNoraTerminalStore } from "@main/helpers/noraTerminalStore";
import type { AppState, LocalTerminalState, TerminalSession } from "@shared/appTypes";
import { createInitialState } from "@main/orchestrator/createAppInitialState";

function workspaceTerminal(partial: Partial<TerminalSession> & Pick<TerminalSession, "id" | "projectId" | "name">): TerminalSession {
  return {
    sessionId: "session",
    worktreeId: "worktree",
    status: "running",
    isBusy: false,
    workspace: "/repo",
    currentWorkingDirectory: "/repo",
    branch: "main",
    host: "local",
    shellId: "zsh",
    shellLabel: "zsh",
    command: "",
    pid: 1,
    lastEventAt: "2026-11-25T00:00:00.000Z",
    lastTerminalLine: "ready",
    launchConfig: { kind: "blank", command: "", label: "Terminal" },
    rawTerminalOutput: "",
    detectedLocalUrl: null,
    detectedLocalPort: null,
    changeSummary: null,
    ...partial
  };
}

function localTerminal(partial: Partial<LocalTerminalState> = {}): LocalTerminalState {
  return {
    id: "local-1",
    name: "Local Terminal",
    workspace: "/home",
    shellId: "zsh",
    shellLabel: "zsh",
    command: "",
    status: "running",
    pid: 2,
    lastEventAt: "2026-11-25T00:00:00.000Z",
    lastTerminalLine: "ssh>",
    rawTerminalOutput: "",
    detectedLocalUrl: null,
    detectedLocalPort: null,
    ...partial
  };
}

function storeDeps(overrides: Partial<Parameters<typeof createNoraTerminalStore>[0]> = {}) {
  return {
    workspaceTerminals: () => [] as readonly TerminalSession[],
    getLocalTerminal: () => null as LocalTerminalState | null,
    openShellProjectId: () => "shell-a" as string | null,
    openLocalTerminal: async () => localTerminal(),
    createWorkspaceTerminal: async (): Promise<AppState> => createInitialState(),
    sendInput: async () => undefined,
    focusWorkspaceTerminal: async () => undefined,
    ...overrides
  };
}

test("list includes the local dock and only this project's workspace terminals", () => {
  const store = createNoraTerminalStore(storeDeps({
    workspaceTerminals: () => [
      workspaceTerminal({ id: "t1", projectId: "shell-a", name: "A" }),
      workspaceTerminal({ id: "t2", projectId: "shell-b", name: "B" })
    ],
    getLocalTerminal: () => localTerminal()
  }));

  const listed = store.list("shell-a");
  assert.deepEqual(listed.map((entry) => entry.id), ["local-1", "t1"]);
  assert.equal(listed[0]?.kind, "local");
  assert.equal(listed[1]?.kind, "workspace");
});

test("list without a shell project only returns the local dock", () => {
  const store = createNoraTerminalStore(storeDeps({
    workspaceTerminals: () => [workspaceTerminal({ id: "t1", projectId: "shell-a", name: "A" })],
    getLocalTerminal: () => localTerminal()
  }));
  assert.deepEqual(store.list(null).map((entry) => entry.id), ["local-1"]);
});

test("open local returns the permanent dock", async () => {
  const store = createNoraTerminalStore(storeDeps({
    openLocalTerminal: async () => localTerminal({ id: "local-opened" })
  }));
  const opened = await store.open({ kind: "local" });
  assert.equal(opened.id, "local-opened");
  assert.equal(opened.kind, "local");
});

test("open workspace creates a blank terminal when the project is open", async () => {
  const created = workspaceTerminal({ id: "t-new", projectId: "shell-a", name: "SSH box" });
  const payloads: unknown[] = [];
  const store = createNoraTerminalStore(storeDeps({
    openShellProjectId: () => "shell-a",
    createWorkspaceTerminal: async (payload) => {
      payloads.push(payload);
      return {
        ...createInitialState(),
        terminals: [created],
        focusedTerminalId: created.id
      };
    }
  }));
  const opened = await store.open({ kind: "workspace", shellProjectId: "shell-a", name: "SSH box" });
  assert.equal(opened.id, "t-new");
  assert.deepEqual(payloads, [{
    name: "SSH box",
    target: { kind: "root" },
    launchConfig: { kind: "blank", command: "", label: "Shell" }
  }]);
});

test("open workspace refuses when another project is open in the window", async () => {
  const store = createNoraTerminalStore(storeDeps({
    openShellProjectId: () => "other"
  }));
  await assert.rejects(
    () => store.open({ kind: "workspace", shellProjectId: "shell-a" }),
    /Open this workspace in Nora/
  );
});

test("paste writes into a terminal and focuses workspace tabs", async () => {
  const written: string[] = [];
  const focused: string[] = [];
  const store = createNoraTerminalStore(storeDeps({
    workspaceTerminals: () => [workspaceTerminal({ id: "t1", projectId: "shell-a", name: "SSH" })],
    getLocalTerminal: () => localTerminal(),
    sendInput: async (id, input) => { written.push(`${id}:${input}`); },
    focusWorkspaceTerminal: async (id) => { focused.push(id); }
  }));

  const workspace = await store.paste("t1", "uptime");
  assert.equal(workspace.id, "t1");
  assert.deepEqual(written, ["t1:uptime"]);
  assert.deepEqual(focused, ["t1"]);

  written.length = 0;
  focused.length = 0;
  const local = await store.paste("local-1", "whoami");
  assert.equal(local.kind, "local");
  assert.deepEqual(written, ["local-1:whoami"]);
  assert.deepEqual(focused, []);
});

test("paste rejects stopped terminals", async () => {
  const store = createNoraTerminalStore(storeDeps({
    getLocalTerminal: () => localTerminal({ status: "stopped" })
  }));
  await assert.rejects(() => store.paste("local-1", "ls"), /stopped/);
});
