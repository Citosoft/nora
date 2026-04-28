import type { ActiveRemoteMount, AgentDetectionInfo, WorkspaceLocation } from "@shared/appTypes";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { WorkspaceTarget } from "../types/internal.types";
import { detectDirectSshSupport, findSshExecutable, resolveRemotePayload } from "../remoteMounts";
import type { detectRemoteAgentCatalog } from "./environmentDetection";

type RemoteGitDependencies = {
  execFileAsync: (
    file: string,
    args: readonly string[],
    options: {
      windowsHide: boolean;
      maxBuffer: number;
      timeout: number;
      env: NodeJS.ProcessEnv;
      cwd?: string;
    }
  ) => Promise<{ stdout: string; stderr: string }>;
  buildProcessEnv: (env: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
  buildGitCommand: (target: WorkspaceTarget, args: string[]) => string;
  mapGitArgumentToMountedRemotePath: (arg: string, mount: ActiveRemoteMount) => string;
  mapMountedRemoteTextToLocal: (text: string, mount: ActiveRemoteMount) => string;
  resolveMountedGitTarget: (
    target: WorkspaceTarget
  ) => Promise<{ mount: ActiveRemoteMount; remoteTarget: WorkspaceTarget } | null>;
  getWorkspaceLocation: (target: WorkspaceTarget) => WorkspaceLocation;
  findGitExecutableFromEnvironment: () => Promise<string | null>;
  detectRemoteAgentCatalog: typeof detectRemoteAgentCatalog;
  remoteSshCommandTimeoutMs: number;
  localGitCommandTimeoutMs: number;
};

export function normalizeWorkspaceRelativePath(relativePath: string): string {
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, "/")).replace(/^(\.\/)+/, "");
  if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized.startsWith("/")) {
    throw new Error("Invalid workspace file path.");
  }
  return normalized;
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

export function normalizeRemoteShellPath(value: string): string {
  return value.startsWith("~/") ? `$HOME/${value.slice(2)}` : value;
}

export function wrapRemoteLoginShellCommand(command: string): string {
  const bootstrap = [
    "if [ -f ~/.profile ]; then . ~/.profile >/dev/null 2>&1; fi",
    "if [ -f ~/.bash_profile ]; then . ~/.bash_profile >/dev/null 2>&1; fi",
    "if [ -f ~/.bashrc ]; then . ~/.bashrc >/dev/null 2>&1; fi",
    command
  ].join("; ");
  return `exec \${SHELL:-/bin/bash} -lc ${shellQuote(bootstrap)}`;
}

function getRemoteSshCommandScope(location: Extract<WorkspaceLocation, { kind: "ssh" }>): string {
  return `${location.user}@${location.host}:${location.port || 22}`;
}

export function createRemoteGitHelpers(deps: RemoteGitDependencies) {
  const remoteSshCommandChains = new Map<string, Promise<void>>();
  let sshControlSocketsDirPromise: Promise<string | null> | null = null;

  const getSshControlSocketPath = async (location: Extract<WorkspaceLocation, { kind: "ssh" }>): Promise<string | null> => {
    if (process.platform === "win32") {
      return null;
    }

    if (!sshControlSocketsDirPromise) {
      sshControlSocketsDirPromise = fs.mkdir(path.join(os.tmpdir(), "nora-ssh-controls"), { recursive: true })
        .then(() => path.join(os.tmpdir(), "nora-ssh-controls"))
        .catch(() => null);
    }

    const controlDir = await sshControlSocketsDirPromise;
    if (!controlDir) {
      return null;
    }

    const scopeHash = getRemoteSshCommandScope(location)
      .split("")
      .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
    return path.join(controlDir, `nora-${Math.abs(scopeHash).toString(16)}`);
  };

  const runRemoteSshCommand = async (target: WorkspaceTarget, command: string): Promise<{ stdout: string; stderr: string }> => {
    const location = deps.getWorkspaceLocation(target);
    if (location.kind !== "ssh") {
      throw new Error("SSH command requested for a non-SSH workspace.");
    }

    const scope = getRemoteSshCommandScope(location);
    const prior = remoteSshCommandChains.get(scope) || Promise.resolve();

    let releaseChain: () => void = () => {};
    const nextChain = new Promise<void>((resolve) => {
      releaseChain = resolve;
    });
    const queuedChain = prior.catch(() => undefined).then(() => nextChain);
    remoteSshCommandChains.set(scope, queuedChain);

    await prior.catch(() => undefined);

    try {
      const support = await detectDirectSshSupport();
      if (!support.supported) {
        throw new Error(support.reason || "No SSH client was found on this machine.");
      }
      const sshExecutable = await findSshExecutable();
      if (!sshExecutable) {
        throw new Error("No SSH client was found on this machine.");
      }

      const sshLookupHost = location.alias?.trim() || location.host;
      const resolved = await resolveRemotePayload({
        host: sshLookupHost,
        user: location.user,
        port: location.port,
        remotePath: target.path,
        alias: location.alias || undefined,
        connectionMode: "ssh"
      });
      const args = [
        "-o",
        "BatchMode=yes",
        "-o",
        "StrictHostKeyChecking=accept-new",
        "-o",
        "ConnectTimeout=15"
      ];
      const controlPath = await getSshControlSocketPath(location);
      if (controlPath) {
        args.push("-o", "ControlMaster=auto", "-o", "ControlPersist=60", "-o", `ControlPath=${controlPath}`);
      }
      if (resolved.port) {
        args.push("-p", String(resolved.port));
      }
      const destinationHost = location.alias?.trim() || resolved.host;
      args.push(resolved.user ? `${resolved.user}@${destinationHost}` : destinationHost, command);
      return await deps.execFileAsync(sshExecutable, args, {
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
        timeout: deps.remoteSshCommandTimeoutMs,
        env: deps.buildProcessEnv(process.env)
      });
    } finally {
      releaseChain();
      if (remoteSshCommandChains.get(scope) === queuedChain) {
        remoteSshCommandChains.delete(scope);
      }
    }
  };

  const execGit = async (
    target: WorkspaceTarget,
    args: string[],
    maxBuffer = 1024 * 1024
  ): Promise<{ stdout: string; stderr: string }> => {
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      return runRemoteSshCommand(target, deps.buildGitCommand(target, args));
    }
    const mountedTarget = await deps.resolveMountedGitTarget(target);
    if (mountedTarget) {
      const remoteArgs = args.map((arg) => deps.mapGitArgumentToMountedRemotePath(arg, mountedTarget.mount));
      if (args.length === 2 && args[0] === "rev-parse" && args[1] === "--show-toplevel") {
        const cdupResult = await runRemoteSshCommand(
          mountedTarget.remoteTarget,
          deps.buildGitCommand(mountedTarget.remoteTarget, ["rev-parse", "--show-cdup"])
        );
        const cdup = cdupResult.stdout.trim().replace(/[\\/]+$/, "");
        const localTopLevel = cdup ? path.resolve(target.path, cdup) : target.path;
        return {
          stdout: `${localTopLevel}\n`,
          stderr: cdupResult.stderr
        };
      }
      const result = await runRemoteSshCommand(
        mountedTarget.remoteTarget,
        deps.buildGitCommand(mountedTarget.remoteTarget, remoteArgs)
      );
      return {
        stdout: deps.mapMountedRemoteTextToLocal(result.stdout, mountedTarget.mount),
        stderr: deps.mapMountedRemoteTextToLocal(result.stderr, mountedTarget.mount)
      };
    }
    const gitExecutable = await deps.findGitExecutableFromEnvironment();
    if (!gitExecutable) {
      throw new Error("Git could not be found on this machine. Install git or make sure it is available to the app process.");
    }
    return deps.execFileAsync(gitExecutable, args, {
      cwd: target.path,
      maxBuffer,
      timeout: deps.localGitCommandTimeoutMs,
      env: deps.buildProcessEnv(process.env),
      windowsHide: true
    });
  };

  const workspacePathExists = async (target: WorkspaceTarget, relativePath: string): Promise<boolean> => {
    const location = deps.getWorkspaceLocation(target);
    if (location.kind === "ssh") {
      const remotePath = path.posix.join(target.path.replace(/\\/g, "/"), relativePath.replace(/\\/g, "/"));
      const normalizedPath = normalizeRemoteShellPath(remotePath);
      try {
        await runRemoteSshCommand(target, `test -f ${normalizedPath.startsWith("$HOME/") ? normalizedPath : shellQuote(normalizedPath)}`);
        return true;
      } catch {
        return false;
      }
    }

    try {
      await fs.access(path.join(target.path, relativePath));
      return true;
    } catch {
      return false;
    }
  };

  const detectRemoteAgentCatalogForTarget = (target: WorkspaceTarget): Promise<AgentDetectionInfo[]> =>
    deps.detectRemoteAgentCatalog(
      (command) => runRemoteSshCommand(target, command),
      wrapRemoteLoginShellCommand,
      shellQuote
    );

  return {
    runRemoteSshCommand,
    execGit,
    workspacePathExists,
    detectRemoteAgentCatalogForTarget
  };
}
