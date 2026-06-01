import type { LocalTerminalState, TerminalShellOption } from "@shared/appTypes";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { buildProcessEnv } from "../processEnv";
import type { RuntimeSession, WorkspaceTarget } from "../types/internal.types";
import type { RuntimeHelperDeps, RuntimeHelpers } from "../types/orchestratorRuntime.types";

export function createRuntimeHelpers(deps: RuntimeHelperDeps): RuntimeHelpers {
  let attemptedSpawnHelperPermissionFix = false;
  const execFileAsync = promisify(execFile);

  function extractExecutableToken(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const unwrapped =
      (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ? trimmed.slice(1, -1).trim()
        : trimmed;

    // Terminal shell options provide executable paths directly. Preserve
    // Windows/Unix filesystem paths as-is so backslashes are not treated as
    // escape characters during token parsing.
    const looksLikeWindowsFilesystemPath =
      /^[A-Za-z]:[\\/]/.test(unwrapped) ||
      unwrapped.startsWith("\\\\");
    const looksLikeFilesystemPath =
      looksLikeWindowsFilesystemPath ||
      unwrapped.startsWith("/") ||
      unwrapped.includes("\\");

    if (looksLikeFilesystemPath) {
      if (looksLikeWindowsFilesystemPath) {
        return unwrapped;
      }

      if (!/\s/.test(unwrapped)) {
        return unwrapped;
      }

      // Some callers pass shell flags in the same string (for example
      // "/bin/zsh -l"). In that case use only the executable token.
      const parsedPath = deps.parseCommandArgs(trimmed)?.[0];
      if (parsedPath) {
        return parsedPath;
      }

      return unwrapped.split(/\s+/)[0] || "";
    }

    const parsed = deps.parseCommandArgs(trimmed);
    if (parsed?.[0]) {
      return parsed[0];
    }

    return trimmed.split(/\s+/)[0] || "";
  }

  function isRecoverableSpawnError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const code = "code" in error ? error.code : null;
    const message = "message" in error && typeof error.message === "string" ? error.message : "";

    return (
      code === "ENOENT" ||
      code === "EACCES" ||
      /posix_spawnp failed/i.test(message) ||
      /spawn .* ENOENT/i.test(message)
    );
  }

  async function resolveSpawnCwd(preferredCwd: string): Promise<string> {
    try {
      await fs.access(preferredCwd);
      return preferredCwd;
    } catch {
      return process.cwd();
    }
  }

  async function maybeRepairDarwinSpawnHelperPermissions(): Promise<boolean> {
    if (deps.isWindows() || process.platform !== "darwin" || attemptedSpawnHelperPermissionFix) {
      return false;
    }
    attemptedSpawnHelperPermissionFix = true;

    const packageRoots = new Set<string>();
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodePtyPackagePath = require.resolve("node-pty/package.json");
      packageRoots.add(path.dirname(nodePtyPackagePath));
    } catch {
      // ignore package resolution failures and try fallback paths
    }
    packageRoots.add(path.join(process.cwd(), "node_modules", "node-pty"));
    if (process.resourcesPath) {
      packageRoots.add(path.join(process.resourcesPath, "node_modules", "node-pty"));
      packageRoots.add(path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "node-pty"));
    }

    const candidates = [...packageRoots].flatMap((root) => ([
      path.join(root, "prebuilds", "darwin-arm64", "spawn-helper"),
      path.join(root, "prebuilds", "darwin-x64", "spawn-helper")
    ]));

    let repairedAny = false;
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        await fs.chmod(candidate, 0o755);
        await execFileAsync("/usr/bin/xattr", ["-d", "com.apple.quarantine", candidate]).catch(() => undefined);
        repairedAny = true;
      } catch {
        // ignore missing files and permission errors; continue trying all locations
      }
    }

    for (const root of packageRoots) {
      try {
        await fs.access(root);
        await execFileAsync("/usr/bin/xattr", ["-dr", "com.apple.quarantine", root]).catch(() => undefined);
      } catch {
        // ignore missing roots; best-effort quarantine cleanup only
      }
    }

    return repairedAny;
  }

  async function buildExecutableCandidates(preferredExecutable: string): Promise<string[]> {
    const seeds = [extractExecutableToken(preferredExecutable), extractExecutableToken(deps.getShell())]
      .map((value) => value.trim())
      .filter(Boolean);

    const candidates: string[] = [];
    const seen = new Set<string>();
    const maybeAdd = (candidate: string): void => {
      const trimmed = candidate.trim();
      if (!trimmed || seen.has(trimmed)) {
        return;
      }
      seen.add(trimmed);
      candidates.push(trimmed);
    };

    for (const seed of seeds) {
      maybeAdd(seed);
      if (seed.startsWith("/")) {
        continue;
      }
      for (const location of ["/bin", "/usr/bin", "/usr/local/bin", "/opt/homebrew/bin"]) {
        maybeAdd(path.join(location, seed));
      }
    }

    return candidates.length ? candidates : [deps.getShell()];
  }

  type PtyProcess = ReturnType<RuntimeHelperDeps["spawnPty"]>;

  function getShellNoticeToolLabel(toolLabel: string): string {
    const normalized = toolLabel.replace(/[^A-Za-z0-9 ._-]/g, "").trim();
    return normalized || "Agent";
  }

  function buildPersistentAgentShellCommand(toolLabel: string, command: string): string {
    return `{ ${command}; }; exit_code=$?; printf '\\n[${getShellNoticeToolLabel(toolLabel)} exited with code %s; shell remains open]\\n' "$exit_code"; exec "\${SHELL:-/bin/sh}" -i`;
  }

  function getInteractiveShellArgsForChild(executable: string): string[] {
    if (deps.isWindows()) {
      return [];
    }

    const normalized = executable.toLowerCase();
    if (normalized.endsWith("/bash") || normalized.endsWith("/zsh") || normalized.endsWith("/sh")) {
      return ["-i"];
    }

    return [];
  }

  async function resolveChildProcessSpawn(
    preferredExecutable: string,
    command: string,
    preferredCwd: string
  ): Promise<{ executable: string; args: string[]; cwd: string }> {
    const cwd = await resolveSpawnCwd(preferredCwd);
    let executable = extractExecutableToken(preferredExecutable);

    for (const candidate of await buildExecutableCandidates(preferredExecutable)) {
      try {
        await fs.access(candidate);
        executable = candidate;
        break;
      } catch {
        // ignore non-existent executable candidates
      }
    }

    if (!executable) {
      executable = deps.getShell();
    }

    const trimmedCommand = command.trim();
    const shellArgs = trimmedCommand.length > 0
      ? deps.getShellArgsForExecutable(executable, trimmedCommand)
      : getInteractiveShellArgsForChild(executable);

    return { executable, args: shellArgs, cwd };
  }

  async function spawnPtyWithFallback(
    preferredExecutable: string,
    command: string,
    preferredCwd: string,
    env: NodeJS.ProcessEnv
  ): Promise<{ ptyProcess: PtyProcess; cwd: string }> {
    const resolvedPreferredCwd = await resolveSpawnCwd(preferredCwd);
    const cwdCandidates = [resolvedPreferredCwd];
    if (resolvedPreferredCwd !== process.cwd()) {
      cwdCandidates.push(process.cwd());
    }
    const trimmedCommand = command.trim();
    const shouldLaunchInteractiveShell = trimmedCommand.length === 0;
    let lastError: unknown = null;

    for (const cwd of cwdCandidates) {
      for (const executable of await buildExecutableCandidates(preferredExecutable)) {
        const args = shouldLaunchInteractiveShell ? [] : deps.getShellArgsForExecutable(executable, trimmedCommand);
        try {
          const ptyProcess = deps.spawnPty(executable, args, {
            name: "xterm-256color",
            cols: 120,
            rows: 36,
            cwd,
            env
          });
          return { ptyProcess, cwd };
        } catch (error) {
          lastError = error;
          if (!isRecoverableSpawnError(error)) {
            throw error;
          }
          const repaired = await maybeRepairDarwinSpawnHelperPermissions();
          if (repaired) {
            try {
              const ptyProcess = deps.spawnPty(executable, args, {
                name: "xterm-256color",
                cols: 120,
                rows: 36,
                cwd,
                env
              });
              return { ptyProcess, cwd };
            } catch (retryError) {
              lastError = retryError;
              if (!isRecoverableSpawnError(retryError)) {
                throw retryError;
              }
            }
          }
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error("Unable to spawn terminal process.");
  }

  async function prepareWorktree(target: WorkspaceTarget, command: string): Promise<void> {
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const normalizedCwd = deps.normalizeRemoteShellPath(target.path);
      const remoteCwd = normalizedCwd.startsWith("$HOME/") ? normalizedCwd : deps.shellQuote(normalizedCwd);
      await deps.runRemoteSshCommand(target, `cd ${remoteCwd} && ${command}`);
      return;
    }

    await deps.execFileAsync(deps.getShell(), deps.getShellArgs(command), {
      cwd: target.path,
      env: buildProcessEnv(process.env),
      maxBuffer: 16 * 1024 * 1024
    });
  }

  function getPreparationFailureTranscript(command: string, error: unknown): string {
    const stdout =
      error && typeof error === "object" && "stdout" in error && typeof error.stdout === "string"
        ? error.stdout
        : "";
    const stderr =
      error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr
        : "";
    const message = error instanceof Error ? error.message : "Unknown error";
    return [`$ ${command}`, stdout.trim(), stderr.trim(), `[prepare failed] ${message}`]
      .filter((part) => part.length > 0)
      .join("\n\n");
  }

  async function spawnAgentPty(
    agentId: string,
    command: string,
    target: WorkspaceTarget,
    toolEnv: Record<string, string>
  ): Promise<void> {
    const agent = deps.getAgentById(agentId);
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const sshExecutable = await deps.findSshExecutable();
      if (!sshExecutable) {
        throw new Error("No SSH client was found on this machine.");
      }
      const args = [
        "-tt",
        "-o",
        "StrictHostKeyChecking=accept-new"
      ];
      if (location.port) {
        args.push("-p", String(location.port));
      }
      const envExports = Object.entries({
        ...toolEnv,
        NORA_AGENT_ID: agentId,
        NORA_WORKSPACE: target.path
      }).map(([key, value]) => `export ${key}=${deps.shellQuote(value)};`).join(" ");
      const normalizedCwd = deps.normalizeRemoteShellPath(target.path);
      const remoteCwd = normalizedCwd.startsWith("$HOME/") ? normalizedCwd : deps.shellQuote(normalizedCwd);
      const child = deps.spawnChild(sshExecutable, [
        ...args,
        `${location.user}@${location.host}`,
        "exec ${SHELL:-/bin/bash} -il"
      ], {
        windowsHide: true,
        stdio: "pipe"
      });
      const remoteLaunchCommand = `cd ${remoteCwd} && ${envExports} ${command}`;

      const session: RuntimeSession = {
        pid: child.pid ?? null,
        write(data: string) {
          child.stdin.write(data);
        },
        resize() {
          // SSH sessions remain line-oriented in the current runtime model.
        },
        kill() {
          child.kill();
        }
      };

      deps.setRuntimeSession(agentId, session);
      deps.updateAgent(agentId, {
        status: "running",
        pid: child.pid ?? null,
        lastEventAt: deps.nowIso(),
        isBusy: false,
        busyUntil: null
      });

      child.stdout.on("data", (chunk: Buffer | string) => {
        deps.appendAgentOutput(agentId, chunk.toString());
      });
      child.stderr.on("data", (chunk: Buffer | string) => {
        deps.appendAgentOutput(agentId, chunk.toString());
      });
      child.on("error", (error) => {
        deps.appendAgentOutput(agentId, `\n[ssh error] ${error.message}\n`);
      });
      setTimeout(() => {
        if (!deps.getRuntimeSession(agentId)) {
          return;
        }
        const launchCommand = `stty cols 120 rows 36 && ${remoteLaunchCommand}`;
        session.write(`${launchCommand}\n`);
      }, 400);
      child.on("close", (exitCode, signal) => {
        const suffix =
          signal
            ? `[ssh exited from signal ${signal}]`
            : `[ssh exited with code ${exitCode ?? 0}]`;
        deps.appendAgentOutput(agentId, `\n${suffix}\n`);
        deps.updateAgent(agentId, {
          status: (exitCode ?? 0) === 0 ? "stopped" : "error",
          pid: null,
          lastEventAt: deps.nowIso(),
          isBusy: false,
          busyUntil: null
        });
        deps.deleteRuntimeSession(agentId);
      });
      return;
    }

    const shouldKeepShellOpen = !deps.isWindows();
    const launchCommand = shouldKeepShellOpen ? buildPersistentAgentShellCommand(agent?.toolLabel || "Agent", command) : command;
    const shouldUseShellWrapper = deps.isWindows() || shouldKeepShellOpen;
    const parsedArgs =
      !shouldUseShellWrapper && !deps.hasShellMetacharacters(launchCommand)
        ? deps.parseCommandArgs(launchCommand)
        : null;
    const executable = parsedArgs?.[0] || deps.getShell();
    const args = parsedArgs ? parsedArgs.slice(1) : deps.getPtyShellArgs(launchCommand);
    const ptyProcess = deps.spawnPty(executable, args, {
      name: "xterm-256color",
      cols: 120,
      rows: 36,
      cwd: target.path,
      env: deps.getPtyEnv(process.env, {
        ...toolEnv,
        NORA_AGENT_ID: agentId,
        NORA_WORKSPACE: target.path,
        NORA_AGENT_CONTEXT_FILE: agent?.contextFilePath || "",
        NORA_AGENT_TERMINAL_STREAM_FILE: agent?.terminalStreamPath || "",
        NORA_SHARED_CONTEXT_DIR: agent?.contextFilePath ? path.dirname(agent.contextFilePath) : ""
      }, 120, 36)
    });

    deps.setRuntimeSession(agentId, {
      pid: ptyProcess.pid,
      write(data: string) {
        ptyProcess.write(data);
      },
      resize(cols: number, rows: number) {
        ptyProcess.resize(cols, rows);
      },
      kill() {
        ptyProcess.kill();
      }
    });

    deps.updateAgent(agentId, {
      status: "running",
      pid: ptyProcess.pid,
      lastEventAt: deps.nowIso(),
      isBusy: false,
      busyUntil: null
    });

    let acceptedCodexTrustPrompt = false;
    ptyProcess.onData((data: string) => {
      deps.appendAgentOutput(agentId, data);

      if (agent?.toolId !== "codex" || acceptedCodexTrustPrompt) {
        return;
      }

      const currentOutput = deps.getAgentById(agentId)?.rawTerminalOutput || "";
      const plainOutput = currentOutput.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/\s+/g, " ");
      if (plainOutput.includes("Do you trust the contents of this directory?")) {
        acceptedCodexTrustPrompt = true;
        ptyProcess.write("1\r");
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      const suffix =
        signal !== 0
          ? `[pty exited from signal ${signal}]`
          : `[pty exited with code ${exitCode}]`;
      deps.appendAgentOutput(agentId, `\n${suffix}\n`);
      deps.updateAgent(agentId, {
        status: exitCode === 0 ? "stopped" : "error",
        pid: null,
        lastEventAt: deps.nowIso(),
        isBusy: false,
        busyUntil: null
      });
      deps.deleteRuntimeSession(agentId);
    });
  }

  async function spawnTerminalPty(
    terminalId: string,
    command: string,
    target: WorkspaceTarget,
    shell: TerminalShellOption
  ): Promise<void> {
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const sshExecutable = await deps.findSshExecutable();
      if (!sshExecutable) {
        throw new Error("No SSH client was found on this machine.");
      }
      const args = [
        "-tt",
        "-o",
        "StrictHostKeyChecking=accept-new"
      ];
      if (location.port) {
        args.push("-p", String(location.port));
      }
      const normalizedCwd = deps.normalizeRemoteShellPath(target.path);
      const remoteCwd = normalizedCwd.startsWith("$HOME/") ? normalizedCwd : deps.shellQuote(normalizedCwd);
      const remoteCommand = command.trim() ? command.trim() : "exec ${SHELL:-/bin/bash} -il";
      const child = deps.spawnChild(sshExecutable, [
        ...args,
        `${location.user}@${location.host}`,
        `cd ${remoteCwd} && ${remoteCommand}`
      ], {
        windowsHide: true,
        stdio: "pipe"
      });

      const runtimeSession: RuntimeSession = {
        pid: child.pid ?? null,
        write(data: string) {
          child.stdin.write(data);
        },
        resize() {
          // SSH sessions remain line-oriented in the current runtime model.
        },
        kill() {
          child.kill();
        }
      };
      deps.setRuntimeSession(terminalId, runtimeSession);

      deps.updateTerminal(terminalId, {
        status: "running",
        pid: child.pid ?? null,
        lastEventAt: deps.nowIso()
      });

      child.stdout.on("data", (chunk: Buffer | string) => {
        deps.appendTerminalOutput(terminalId, chunk.toString());
      });
      child.stderr.on("data", (chunk: Buffer | string) => {
        deps.appendTerminalOutput(terminalId, chunk.toString());
      });
      child.on("close", (exitCode, signal) => {
        if (deps.getRuntimeSession(terminalId) !== runtimeSession) {
          return;
        }
        const suffix =
          signal
            ? `[ssh exited from signal ${signal}]`
            : `[ssh exited with code ${exitCode ?? 0}]`;
        deps.appendTerminalOutput(terminalId, `\r\n${suffix}\r\n`);
        deps.updateTerminal(terminalId, {
          status: (exitCode ?? 0) === 0 ? "stopped" : "error",
          pid: null,
          lastEventAt: deps.nowIso(),
          detectedLocalUrl: null,
          detectedLocalPort: null
        });
        deps.deleteRuntimeSession(terminalId);
      });
      return;
    }

    const terminalEnv = deps.getPtyEnv(process.env, {
      NORA_TERMINAL_ID: terminalId,
      NORA_WORKSPACE: target.path
    }, 120, 36);
    let spawnResult: { ptyProcess: PtyProcess; cwd: string } | null = null;
    let recoverableSpawnFailureReason: string | null = null;
    try {
      spawnResult = await spawnPtyWithFallback(
        shell.executable,
        command,
        target.path,
        terminalEnv
      );
    } catch (error) {
      if (!isRecoverableSpawnError(error)) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to spawn terminal shell "${shell.label}" in ${target.path}: ${detail}`);
      }
      recoverableSpawnFailureReason = error instanceof Error ? error.message : String(error);
    }

    if (spawnResult) {
      const ptyProcess = spawnResult.ptyProcess;
      const runtimeSession: RuntimeSession = {
        pid: ptyProcess.pid,
        write(data: string) {
          ptyProcess.write(data);
        },
        resize(cols: number, rows: number) {
          ptyProcess.resize(cols, rows);
        },
        kill() {
          ptyProcess.kill();
        }
      };
      deps.setRuntimeSession(terminalId, runtimeSession);

      deps.updateTerminal(terminalId, {
        status: "running",
        pid: ptyProcess.pid,
        lastEventAt: deps.nowIso()
      });

      ptyProcess.onData((data: string) => {
        deps.appendTerminalOutput(terminalId, data);
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        if (deps.getRuntimeSession(terminalId) !== runtimeSession) {
          return;
        }
        const suffix =
          signal !== 0
            ? `[pty exited from signal ${signal}]`
            : `[pty exited with code ${exitCode}]`;
        deps.appendTerminalOutput(terminalId, `\r\n${suffix}\r\n`);
        deps.updateTerminal(terminalId, {
          status: exitCode === 0 ? "stopped" : "error",
          pid: null,
          lastEventAt: deps.nowIso(),
          detectedLocalUrl: null,
          detectedLocalPort: null
        });
        deps.deleteRuntimeSession(terminalId);
      });
      return;
    }

    const spawn = await resolveChildProcessSpawn(shell.executable, command, target.path);
    const child = deps.spawnChild(spawn.executable, spawn.args, {
      cwd: spawn.cwd,
      env: terminalEnv,
      windowsHide: true,
      stdio: "pipe"
    });
    const runtimeSession: RuntimeSession = {
      pid: child.pid ?? null,
      write(data: string) {
        child.stdin.write(data);
      },
      resize() {
        // no-op in fallback pipe mode
      },
      kill() {
        child.kill();
      }
    };
    deps.setRuntimeSession(terminalId, runtimeSession);

    deps.updateTerminal(terminalId, {
      status: "running",
      pid: child.pid ?? null,
      lastEventAt: deps.nowIso()
    });
    deps.appendTerminalOutput(
      terminalId,
      `\r\n[terminal notice] PTY unavailable; using fallback terminal mode${
        recoverableSpawnFailureReason ? ` (${recoverableSpawnFailureReason})` : ""
      }.\r\n`
    );

    child.stdout.on("data", (chunk: Buffer | string) => {
      deps.appendTerminalOutput(terminalId, chunk.toString());
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      deps.appendTerminalOutput(terminalId, chunk.toString());
    });
    child.on("error", (error: Error) => {
      if (deps.getRuntimeSession(terminalId) !== runtimeSession) {
        return;
      }
      deps.appendTerminalOutput(terminalId, `\r\n[process error] ${error.message}\r\n`);
      deps.updateTerminal(terminalId, {
        status: "error",
        pid: null,
        lastEventAt: deps.nowIso(),
        detectedLocalUrl: null,
        detectedLocalPort: null
      });
      deps.deleteRuntimeSession(terminalId);
    });
    child.on("close", (exitCode, signal) => {
      if (deps.getRuntimeSession(terminalId) !== runtimeSession) {
        return;
      }
      const suffix =
        signal
          ? `[process exited from signal ${signal}]`
          : `[process exited with code ${exitCode ?? 0}]`;
      deps.appendTerminalOutput(terminalId, `\r\n${suffix}\r\n`);
      deps.updateTerminal(terminalId, {
        status: (exitCode ?? 0) === 0 ? "stopped" : "error",
        pid: null,
        lastEventAt: deps.nowIso(),
        detectedLocalUrl: null,
        detectedLocalPort: null
      });
      deps.deleteRuntimeSession(terminalId);
    });
  }

  async function spawnLocalTerminalPty(localTerminal: LocalTerminalState, shell: TerminalShellOption): Promise<void> {
    const terminalId = localTerminal.id;
    const terminalEnv = deps.getPtyEnv(process.env, {
      NORA_LOCAL_TERMINAL_ID: terminalId,
      NORA_WORKSPACE: localTerminal.workspace
    }, 120, 36);
    let spawnResult: { ptyProcess: PtyProcess; cwd: string } | null = null;
    let recoverableSpawnFailureReason: string | null = null;
    try {
      spawnResult = await spawnPtyWithFallback(
        shell.executable,
        "",
        localTerminal.workspace,
        terminalEnv
      );
    } catch (error) {
      if (!isRecoverableSpawnError(error)) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to spawn local terminal shell "${shell.label}" in ${localTerminal.workspace}: ${detail}`);
      }
      recoverableSpawnFailureReason = error instanceof Error ? error.message : String(error);
    }

    if (spawnResult) {
      const ptyProcess = spawnResult.ptyProcess;
      const runtimeSession: RuntimeSession = {
        pid: ptyProcess.pid,
        write(data: string) {
          ptyProcess.write(data);
        },
        resize(cols: number, rows: number) {
          ptyProcess.resize(cols, rows);
        },
        kill() {
          ptyProcess.kill();
        }
      };
      deps.setRuntimeSession(terminalId, runtimeSession);

      deps.updateLocalTerminal({
        status: "running",
        pid: ptyProcess.pid,
        lastEventAt: deps.nowIso()
      });

      ptyProcess.onData((data: string) => {
        deps.appendLocalTerminalOutput(data);
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        if (deps.getRuntimeSession(terminalId) !== runtimeSession) {
          return;
        }
        const suffix =
          signal !== 0
            ? `[pty exited from signal ${signal}]`
            : `[pty exited with code ${exitCode}]`;
        deps.appendLocalTerminalOutput(`\r\n${suffix}\r\n`);
        deps.updateLocalTerminal({
          status: exitCode === 0 ? "stopped" : "error",
          pid: null,
          lastEventAt: deps.nowIso(),
          detectedLocalUrl: null,
          detectedLocalPort: null
        });
        deps.deleteRuntimeSession(terminalId);
      });
      return;
    }

    const spawn = await resolveChildProcessSpawn(shell.executable, "", localTerminal.workspace);
    const child = deps.spawnChild(spawn.executable, spawn.args, {
      cwd: spawn.cwd,
      env: terminalEnv,
      windowsHide: true,
      stdio: "pipe"
    });
    const runtimeSession: RuntimeSession = {
      pid: child.pid ?? null,
      write(data: string) {
        child.stdin.write(data);
      },
      resize() {
        // no-op in fallback pipe mode
      },
      kill() {
        child.kill();
      }
    };
    deps.setRuntimeSession(terminalId, runtimeSession);

    deps.updateLocalTerminal({
      status: "running",
      pid: child.pid ?? null,
      lastEventAt: deps.nowIso()
    });
    deps.appendLocalTerminalOutput(
      `\r\n[terminal notice] PTY unavailable; using fallback terminal mode${
        recoverableSpawnFailureReason ? ` (${recoverableSpawnFailureReason})` : ""
      }.\r\n`
    );

    child.stdout.on("data", (chunk: Buffer | string) => {
      deps.appendLocalTerminalOutput(chunk.toString());
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      deps.appendLocalTerminalOutput(chunk.toString());
    });
    child.on("error", (error: Error) => {
      if (deps.getRuntimeSession(terminalId) !== runtimeSession) {
        return;
      }
      deps.appendLocalTerminalOutput(`\r\n[process error] ${error.message}\r\n`);
      deps.updateLocalTerminal({
        status: "error",
        pid: null,
        lastEventAt: deps.nowIso(),
        detectedLocalUrl: null,
        detectedLocalPort: null
      });
      deps.deleteRuntimeSession(terminalId);
    });
    child.on("close", (exitCode, signal) => {
      if (deps.getRuntimeSession(terminalId) !== runtimeSession) {
        return;
      }
      const suffix =
        signal
          ? `[process exited from signal ${signal}]`
          : `[process exited with code ${exitCode ?? 0}]`;
      deps.appendLocalTerminalOutput(`\r\n${suffix}\r\n`);
      deps.updateLocalTerminal({
        status: (exitCode ?? 0) === 0 ? "stopped" : "error",
        pid: null,
        lastEventAt: deps.nowIso(),
        detectedLocalUrl: null,
        detectedLocalPort: null
      });
      deps.deleteRuntimeSession(terminalId);
    });
  }

  return {
    prepareWorktree,
    getPreparationFailureTranscript,
    spawnAgentPty,
    spawnTerminalPty,
    spawnLocalTerminalPty
  };
}
