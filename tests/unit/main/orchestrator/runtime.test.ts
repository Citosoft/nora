import { createRuntimeHelpers } from "@main/orchestrator/runtime";
import type { RuntimeSession, WorkspaceTarget } from "@main/types/internal.types";
import type { RuntimeHelperDeps } from "@main/types/orchestratorRuntime.types";
import type { AgentSession, TerminalShellOption } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

type SpawnCall = {
  executable: string;
  argv: string[];
  cwd: string | undefined;
};

function normalizePtyArgv(argv: string | string[]): string[] {
  return Array.isArray(argv) ? argv : [argv];
}

function createAgentSession(overrides: Partial<AgentSession>): AgentSession {
  return {
    id: "agent-1",
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    mode: "write",
    name: "Agent",
    toolId: "codex",
    toolLabel: "Codex",
    status: "running",
    workspace: process.cwd(),
    branch: "main",
    host: "local",
    task: "",
    command: "codex --no-alt-screen",
    pid: null,
    lastEventAt: "2026-04-15T00:00:00.000Z",
    lastTerminalLine: "",
    resumeSessionId: null,
    resumeCommand: null,
    contextFilePath: "",
    terminalStreamPath: "",
    isBusy: false,
    busyUntil: null,
    terminalOutput: [],
    rawTerminalOutput: "",
    changeSummary: null,
    ...overrides
  };
}

function createDeps(args?: {
  getShell?: string;
  isWindows?: boolean;
  appendAgentOutput?: RuntimeHelperDeps["appendAgentOutput"];
  spawnPtyImpl?: RuntimeHelperDeps["spawnPty"];
  spawnChildImpl?: RuntimeHelperDeps["spawnChild"];
}): RuntimeHelperDeps {
  const runtimeSessions = new Map<string, RuntimeSession>();
  const createPty = () => ({
    pid: 1234,
    cols: 120,
    rows: 36,
    process: "zsh",
    handleFlowControl: false,
    pause: () => undefined,
    resume: () => undefined,
    write: () => undefined,
    resize: () => undefined,
    kill: () => undefined,
    clear: () => undefined,
    onData: () => ({ dispose: () => undefined }),
    onExit: () => ({ dispose: () => undefined })
  });
  const defaultSpawnPty: RuntimeHelperDeps["spawnPty"] = (
    _executable: Parameters<RuntimeHelperDeps["spawnPty"]>[0],
    _argv: Parameters<RuntimeHelperDeps["spawnPty"]>[1],
    _options: Parameters<RuntimeHelperDeps["spawnPty"]>[2]
  ) => createPty() as unknown as ReturnType<RuntimeHelperDeps["spawnPty"]>;
  const spawnPtyImpl = args?.spawnPtyImpl || defaultSpawnPty;

  return {
    nowIso: () => "2026-04-15T00:00:00.000Z",
    findSshExecutable: async () => null,
    getWorkspaceLocation: (target) => target.location || { kind: "local" },
    normalizeRemoteShellPath: (value) => value,
    shellQuote: (value) => `'${value}'`,
    runRemoteSshCommand: async () => ({ stdout: "", stderr: "" }),
    execFileAsync: async () => ({ stdout: "", stderr: "" }),
    isWindows: () => args?.isWindows ?? false,
    hasShellMetacharacters: () => false,
    parseCommandArgs: (command) => command.split(/\s+/).filter(Boolean),
    getShell: () => args?.getShell || "/bin/sh",
    getShellArgs: (command) => ["-lc", command],
    getPtyShellArgs: (command) => ["-lc", command],
    getPtyEnv: (baseEnv, extraEnv) => ({ ...baseEnv, ...extraEnv }),
    spawnPty: spawnPtyImpl,
    spawnChild: args?.spawnChildImpl || ((() => {
      throw new Error("not used in this test");
    }) as RuntimeHelperDeps["spawnChild"]),
    getShellArgsForExecutable: (_executable, command) => ["-lc", command],
    getAgentById: (agentId) => {
      if (agentId === "codex-agent") {
        return createAgentSession({ id: agentId });
      }
      if (agentId === "claude-agent") {
        return createAgentSession({
          id: agentId,
          toolId: "claude",
          toolLabel: "Claude",
          command: "claude"
        });
      }
      return null;
    },
    getRuntimeSession: (sessionId) => runtimeSessions.get(sessionId),
    setRuntimeSession: (sessionId, session) => {
      runtimeSessions.set(sessionId, session);
    },
    deleteRuntimeSession: (sessionId) => {
      runtimeSessions.delete(sessionId);
    },
    updateAgent: () => undefined,
    updateTerminal: () => undefined,
    updateLocalTerminal: () => undefined,
    appendAgentOutput: args?.appendAgentOutput || (() => undefined),
    appendTerminalOutput: () => undefined,
    appendLocalTerminalOutput: () => undefined
  };
}

function createTarget(pathValue: string): WorkspaceTarget {
  return {
    path: pathValue,
    location: { kind: "local" }
  };
}

function createShell(executable: string): TerminalShellOption {
  return {
    id: "system",
    label: "System Shell",
    executable
  };
}

test("spawnTerminalPty retries with fallback executable after posix_spawnp failure", async () => {
  const spawnCalls: SpawnCall[] = [];
  const deps = createDeps({
    getShell: "/bin/sh",
    spawnPtyImpl: (((executable: Parameters<RuntimeHelperDeps["spawnPty"]>[0], argv: Parameters<RuntimeHelperDeps["spawnPty"]>[1], options: Parameters<RuntimeHelperDeps["spawnPty"]>[2]) => {
      spawnCalls.push({ executable, argv: normalizePtyArgv(argv), cwd: options.cwd });
      if (executable === "/missing/zsh") {
        throw new Error("posix_spawnp failed.");
      }
      return {
        pid: 4321,
        cols: 120,
        rows: 36,
        process: "zsh",
        handleFlowControl: false,
        pause: () => undefined,
        resume: () => undefined,
        write: () => undefined,
        resize: () => undefined,
        kill: () => undefined,
        clear: () => undefined,
        onData: () => ({ dispose: () => undefined }),
        onExit: () => ({ dispose: () => undefined })
      };
    }) as unknown as RuntimeHelperDeps["spawnPty"])
  });
  const helpers = createRuntimeHelpers(deps);

  await helpers.spawnTerminalPty(
    "terminal-1",
    "",
    createTarget(process.cwd()),
    createShell("/missing/zsh -l")
  );

  assert.equal(spawnCalls.length >= 2, true);
  assert.equal(spawnCalls[0]?.executable, "/missing/zsh");
  assert.equal(spawnCalls[spawnCalls.length - 1]?.executable, "/bin/sh");
});

test("spawnTerminalPty falls back to process cwd when target cwd is missing", async () => {
  const spawnCalls: SpawnCall[] = [];
  const deps = createDeps({
    spawnPtyImpl: (((executable: Parameters<RuntimeHelperDeps["spawnPty"]>[0], argv: Parameters<RuntimeHelperDeps["spawnPty"]>[1], options: Parameters<RuntimeHelperDeps["spawnPty"]>[2]) => {
      spawnCalls.push({ executable, argv: normalizePtyArgv(argv), cwd: options.cwd });
      return {
        pid: 100,
        cols: 120,
        rows: 36,
        process: "zsh",
        handleFlowControl: false,
        pause: () => undefined,
        resume: () => undefined,
        write: () => undefined,
        resize: () => undefined,
        kill: () => undefined,
        clear: () => undefined,
        onData: () => ({ dispose: () => undefined }),
        onExit: () => ({ dispose: () => undefined })
      };
    }) as unknown as RuntimeHelperDeps["spawnPty"])
  });
  const helpers = createRuntimeHelpers(deps);

  await helpers.spawnTerminalPty(
    "terminal-2",
    "",
    createTarget("/path/that/does/not/exist"),
    createShell("/bin/sh")
  );

  assert.equal(spawnCalls.length, 1);
  assert.equal(spawnCalls[0]?.cwd, process.cwd());
});

test("spawnTerminalPty preserves Windows shell paths with spaces", async () => {
  const spawnCalls: SpawnCall[] = [];
  const deps = createDeps({
    isWindows: true,
    spawnPtyImpl: (((executable: Parameters<RuntimeHelperDeps["spawnPty"]>[0], argv: Parameters<RuntimeHelperDeps["spawnPty"]>[1], options: Parameters<RuntimeHelperDeps["spawnPty"]>[2]) => {
      spawnCalls.push({ executable, argv: normalizePtyArgv(argv), cwd: options.cwd });
      return {
        pid: 100,
        cols: 120,
        rows: 36,
        process: "bash",
        handleFlowControl: false,
        pause: () => undefined,
        resume: () => undefined,
        write: () => undefined,
        resize: () => undefined,
        kill: () => undefined,
        clear: () => undefined,
        onData: () => ({ dispose: () => undefined }),
        onExit: () => ({ dispose: () => undefined })
      };
    }) as unknown as RuntimeHelperDeps["spawnPty"])
  });
  const helpers = createRuntimeHelpers(deps);
  const shellPath = "C:\\Program Files\\Git\\bin\\bash.exe";

  await helpers.spawnTerminalPty(
    "terminal-3",
    "",
    createTarget(process.cwd()),
    createShell(shellPath)
  );

  assert.equal(spawnCalls.length >= 1, true);
  assert.equal(spawnCalls[0]?.executable, shellPath);
});

test("spawnAgentPty keeps local Codex sessions inside a shell after Codex exits", async () => {
  const spawnCalls: SpawnCall[] = [];
  const deps = createDeps({
    getShell: "/bin/zsh",
    spawnPtyImpl: (((executable: Parameters<RuntimeHelperDeps["spawnPty"]>[0], argv: Parameters<RuntimeHelperDeps["spawnPty"]>[1], options: Parameters<RuntimeHelperDeps["spawnPty"]>[2]) => {
      spawnCalls.push({ executable, argv: normalizePtyArgv(argv), cwd: options.cwd });
      return {
        pid: 4321,
        cols: 120,
        rows: 36,
        process: "zsh",
        handleFlowControl: false,
        pause: () => undefined,
        resume: () => undefined,
        write: () => undefined,
        resize: () => undefined,
        kill: () => undefined,
        clear: () => undefined,
        onData: () => ({ dispose: () => undefined }),
        onExit: () => ({ dispose: () => undefined })
      };
    }) as unknown as RuntimeHelperDeps["spawnPty"])
  });
  const helpers = createRuntimeHelpers(deps);

  await helpers.spawnAgentPty("codex-agent", "codex --no-alt-screen", createTarget(process.cwd()), {});

  assert.equal(spawnCalls[0]?.executable, "/bin/zsh");
  assert.deepEqual(spawnCalls[0]?.argv.slice(0, 1), ["-lc"]);
  assert.match(spawnCalls[0]?.argv[1] || "", /codex --no-alt-screen/);
  assert.match(spawnCalls[0]?.argv[1] || "", /shell remains open/);
  assert.match(spawnCalls[0]?.argv[1] || "", /exec "\$\{SHELL:-\/bin\/sh\}" -i/);
});

test("spawnAgentPty keeps local non-Codex sessions inside a shell after the agent exits", async () => {
  const spawnCalls: SpawnCall[] = [];
  const deps = createDeps({
    getShell: "/bin/zsh",
    spawnPtyImpl: (((executable: Parameters<RuntimeHelperDeps["spawnPty"]>[0], argv: Parameters<RuntimeHelperDeps["spawnPty"]>[1], options: Parameters<RuntimeHelperDeps["spawnPty"]>[2]) => {
      spawnCalls.push({ executable, argv: normalizePtyArgv(argv), cwd: options.cwd });
      return {
        pid: 4321,
        cols: 120,
        rows: 36,
        process: "zsh",
        handleFlowControl: false,
        pause: () => undefined,
        resume: () => undefined,
        write: () => undefined,
        resize: () => undefined,
        kill: () => undefined,
        clear: () => undefined,
        onData: () => ({ dispose: () => undefined }),
        onExit: () => ({ dispose: () => undefined })
      };
    }) as unknown as RuntimeHelperDeps["spawnPty"])
  });
  const helpers = createRuntimeHelpers(deps);

  await helpers.spawnAgentPty("claude-agent", "claude", createTarget(process.cwd()), {});

  assert.equal(spawnCalls[0]?.executable, "/bin/zsh");
  assert.deepEqual(spawnCalls[0]?.argv.slice(0, 1), ["-lc"]);
  assert.match(spawnCalls[0]?.argv[1] || "", /claude/);
  assert.match(spawnCalls[0]?.argv[1] || "", /Claude exited with code %s; shell remains open/);
  assert.match(spawnCalls[0]?.argv[1] || "", /exec "\$\{SHELL:-\/bin\/sh\}" -i/);
});
