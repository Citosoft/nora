import { createRuntimeHelpers } from "@main/orchestrator/runtime";
import type { RuntimeSession, WorkspaceTarget } from "@main/types/internal.types";
import type { RuntimeHelperDeps } from "@main/types/orchestratorRuntime.types";
import type { TerminalShellOption } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

type SpawnCall = {
  executable: string;
  cwd: string | undefined;
};

function createDeps(args?: {
  getShell?: string;
  isWindows?: boolean;
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
    getAgentById: () => null,
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
    appendAgentOutput: () => undefined,
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
    spawnPtyImpl: (((executable: Parameters<RuntimeHelperDeps["spawnPty"]>[0], _argv: Parameters<RuntimeHelperDeps["spawnPty"]>[1], options: Parameters<RuntimeHelperDeps["spawnPty"]>[2]) => {
      spawnCalls.push({ executable, cwd: options.cwd });
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
    spawnPtyImpl: (((executable: Parameters<RuntimeHelperDeps["spawnPty"]>[0], _argv: Parameters<RuntimeHelperDeps["spawnPty"]>[1], options: Parameters<RuntimeHelperDeps["spawnPty"]>[2]) => {
      spawnCalls.push({ executable, cwd: options.cwd });
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
    spawnPtyImpl: (((executable: Parameters<RuntimeHelperDeps["spawnPty"]>[0], _argv: Parameters<RuntimeHelperDeps["spawnPty"]>[1], options: Parameters<RuntimeHelperDeps["spawnPty"]>[2]) => {
      spawnCalls.push({ executable, cwd: options.cwd });
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
