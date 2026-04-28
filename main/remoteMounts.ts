import type {
  ActiveRemoteMount,
  ConnectRemoteProjectPayload,
  DirectSshSupport,
  RemoteConnectionOptions,
  RemoteMountSupport,
  SshConfigHost
} from "@shared/appTypes";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getRemoteMountsDir } from "./noraPaths";
import { findExecutableOnPath, findExistingPath } from "./processLookup";
import type { MountResult, RemoteMountAdapter, RemoteMountReporter } from "./types/internal.types";

const execFileAsync = promisify(execFile);

const SSHFS_WIN_CANDIDATES = [
  "C:\\Program Files\\SSHFS-Win\\bin\\sshfs-win.exe",
  "C:\\Program Files\\SSHFS-Win\\bin\\sshfs.exe",
  "C:\\Program Files (x86)\\SSHFS-Win\\bin\\sshfs-win.exe",
  "C:\\Program Files (x86)\\SSHFS-Win\\bin\\sshfs.exe"
];

const WINDOWS_SSH_CANDIDATES = [
  "C:\\Windows\\System32\\OpenSSH\\ssh.exe",
  "C:\\Program Files\\Git\\usr\\bin\\ssh.exe"
];

const POSIX_SSH_CANDIDATES = [
  "/usr/bin/ssh",
  "/usr/local/bin/ssh",
  "/opt/homebrew/bin/ssh"
];

const POSIX_SSHFS_CANDIDATES = [
  "/usr/bin/sshfs",
  "/usr/local/bin/sshfs",
  "/opt/homebrew/bin/sshfs"
];

function isWindows(): boolean {
  return process.platform === "win32";
}

function isMac(): boolean {
  return process.platform === "darwin";
}

export async function findSshExecutable(): Promise<string | null> {
  return isWindows()
    ? findExistingPath(WINDOWS_SSH_CANDIDATES) || findExecutableOnPath(["ssh"], true)
    : findExistingPath(POSIX_SSH_CANDIDATES) || findExecutableOnPath(["ssh"], false);
}

export async function detectDirectSshSupport(): Promise<DirectSshSupport> {
  const sshExecutable = await findSshExecutable();
  if (!sshExecutable) {
    return {
      supported: false,
      reason: "No SSH client was found on this machine."
    };
  }

  return {
    supported: true,
    reason: null
  };
}

async function findPosixSshfsExecutable(): Promise<string | null> {
  return findExistingPath(POSIX_SSHFS_CANDIDATES) || findExecutableOnPath(["sshfs"], false);
}

async function findPosixUnmountExecutable(): Promise<string | null> {
  return findExecutableOnPath(["fusermount3", "fusermount", "umount"], false);
}

async function findMacDiskUtilExecutable(): Promise<string | null> {
  return findExistingPath(["/usr/sbin/diskutil"]) || findExecutableOnPath(["diskutil"], false);
}

async function findWindowsSshfsExecutable(): Promise<string | null> {
  return findExistingPath(SSHFS_WIN_CANDIDATES) || findExecutableOnPath(["sshfs-win", "sshfs"], true);
}

async function findPowerShellExecutable(): Promise<string | null> {
  return findExistingPath([
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe"
  ]) || findExecutableOnPath(["powershell.exe", "pwsh"], true);
}

async function findWingetExecutable(): Promise<string | null> {
  return findExecutableOnPath(["winget"], true);
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

function expandSshPath(value: string): string {
  if (value.startsWith("~/")) {
    return path.join(os.homedir(), ".ssh", value.slice(2));
  }
  return value.replace(/^~(?=$|[\\/])/, os.homedir());
}

function sanitizeMountSegment(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "mount";
}

function createMountKey(payload: ConnectRemoteProjectPayload): string {
  const scope = [
    (payload.user || "").trim().toLowerCase(),
    payload.host.trim().toLowerCase(),
    payload.port ? String(payload.port) : "",
    payload.remotePath.trim().replace(/\\/g, "/")
  ].join("|");
  return createHash("sha1").update(scope).digest("hex").slice(0, 8);
}

function getManagedPosixMountPath(payload: ConnectRemoteProjectPayload): string {
  const hostPart = sanitizeMountSegment(payload.host);
  const userPart = sanitizeMountSegment(payload.user || "default");
  const remotePart = sanitizeMountSegment(
    payload.remotePath.trim().replace(/^[/~]+/, "").replace(/\//g, "-") || "home"
  );
  const key = createMountKey(payload);
  return path.join(getRemoteMountsDir(), `${userPart}-${hostPart}-${remotePart}-${key}`);
}

function formatSshTarget(payload: ConnectRemoteProjectPayload): string {
  const userPrefix = payload.user?.trim() ? `${payload.user.trim()}@` : "";
  const remotePath = payload.remotePath.trim().replace(/\\/g, "/");
  const suffix = remotePath ? `:${remotePath}` : ":";
  return `${userPrefix}${payload.host.trim()}${suffix}`;
}

function buildWindowsSshAgentSetupScript(): string {
  return [
    "$ErrorActionPreference = 'Stop'",
    "",
    "Set-Service ssh-agent -StartupType Automatic",
    "Start-Service ssh-agent",
    "",
    "$sshAdd = Join-Path $env:WINDIR 'System32\\OpenSSH\\ssh-add.exe'",
    "$sshDir = Join-Path $env:USERPROFILE '.ssh'",
    "$defaultKeys = @('id_ed25519', 'id_ecdsa', 'id_rsa')",
    "$keysAdded = 0",
    "",
    "foreach ($keyName in $defaultKeys) {",
    "  $keyPath = Join-Path $sshDir $keyName",
    "  if (Test-Path $keyPath) {",
    "    & $sshAdd $keyPath",
    "    if ($LASTEXITCODE -eq 0) {",
    "      $keysAdded += 1",
    "    }",
    "  }",
    "}",
    "",
    "if ($keysAdded -eq 0) {",
    "  Write-Warning 'No default SSH private keys were found in ~/.ssh. Add one manually with ssh-add <path-to-key>.'",
    "}",
    "",
    "Write-Host 'ssh-agent is enabled and any default SSH keys have been loaded.'",
    "Write-Host 'If a host uses a non-default key, add an IdentityFile entry in ~/.ssh/config or run ssh-add with that key path.'"
  ].join("\r\n");
}

function buildWindowsRemoteMountInstallScript(logPath: string): string {
  const escapedLogPath = escapePowerShellSingleQuoted(logPath);
  return [
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference = 'SilentlyContinue'",
    `$logPath = '${escapedLogPath}'`,
    "$packages = @(",
    "  @{ Id = 'WinFsp.WinFsp'; Label = 'WinFsp' },",
    "  @{ Id = 'SSHFS-Win.SSHFS-Win'; Label = 'SSHFS-Win' }",
    ")",
    "",
    "foreach ($package in $packages) {",
    "  Write-Host \"Installing $($package.Label) via winget...\" | Tee-Object -FilePath $logPath -Append",
    "  & winget install --id $package.Id --exact --accept-package-agreements --accept-source-agreements --disable-interactivity *>&1 | Tee-Object -FilePath $logPath -Append",
    "  if ($LASTEXITCODE -ne 0) {",
    "    throw \"winget install failed for $($package.Id) with exit code $LASTEXITCODE.\"",
    "  }",
    "}",
    "",
    "\"Installation complete.\" | Tee-Object -FilePath $logPath -Append"
  ].join("\r\n");
}

export async function resolveRemotePayload(payload: ConnectRemoteProjectPayload): Promise<ConnectRemoteProjectPayload> {
  const requestedHost = payload.host.trim();
  if (!requestedHost) {
    return payload;
  }

  const configHosts = await readSshConfigHosts();
  const matchedHost = configHosts.find((entry) => entry.alias.toLowerCase() === requestedHost.toLowerCase());
  if (!matchedHost) {
    return {
      ...payload,
      host: requestedHost
    };
  }

  return {
    ...payload,
    host: matchedHost.hostname?.trim() || requestedHost,
    user: payload.user?.trim() || matchedHost.user || payload.user,
    port: payload.port ?? matchedHost.port
  };
}

function toErrorMessage(error: unknown, fallback: string): string {
  const detail =
    error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
      ? error.stderr.trim()
      : "";
  const stdout =
    error && typeof error === "object" && "stdout" in error && typeof error.stdout === "string"
      ? error.stdout.trim()
      : "";
  return detail || stdout || fallback;
}

function reportOutput(reporter: RemoteMountReporter | undefined, chunk: string): void {
  if (!reporter) {
    return;
  }

  for (const line of chunk.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) {
      reporter(trimmed);
    }
  }
}

async function runCommandWithStreaming(
  file: string,
  args: string[],
  options: { timeoutMs?: number; reporter?: RemoteMountReporter }
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(file, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    child.stdout.on("data", (chunk: Buffer | string) => {
      const text = chunk.toString();
      stdout += text;
      reportOutput(options.reporter, text);
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = chunk.toString();
      stderr += text;
      reportOutput(options.reporter, text);
    });

    child.on("error", (error) => {
      finish(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        finish();
        return;
      }

      const error = new Error(stderr.trim() || stdout.trim() || `${path.basename(file)} exited with code ${code}.`);
      Object.assign(error, { stdout, stderr, code });
      finish(error);
    });

    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        child.kill();
        const error = new Error(`${path.basename(file)} timed out after ${options.timeoutMs}ms.`);
        Object.assign(error, { stdout, stderr });
        finish(error);
      }, options.timeoutMs);
    }
  });
}

async function verifySshConnectivity(payload: ConnectRemoteProjectPayload, reporter?: RemoteMountReporter): Promise<void> {
  const resolvedPayload = await resolveRemotePayload(payload);
  const sshExecutable = await findSshExecutable();
  if (!sshExecutable) {
    throw new Error("No SSH client was found on this machine.");
  }

  const remoteUser = (resolvedPayload.user || "").trim();
  if (!remoteUser) {
    throw new Error("A remote SSH user is required for SSH mounts.");
  }

  const args = [
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ConnectTimeout=10"
  ];
  if (resolvedPayload.port) {
    args.push("-p", String(resolvedPayload.port));
  }
  args.push(`${remoteUser}@${resolvedPayload.host}`, "exit");

  try {
    await runCommandWithStreaming(sshExecutable, args, {
      timeoutMs: 15000,
      reporter
    });
  } catch (error) {
    throw new Error(toErrorMessage(error, "SSH authentication failed before the mount could start."));
  }
}

export async function readSshConfigHosts(): Promise<SshConfigHost[]> {
  const configPath = path.join(os.homedir(), ".ssh", "config");
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const hosts: SshConfigHost[] = [];
    let currentAliases: string[] = [];
    let currentValues: Omit<SshConfigHost, "alias"> = {
      hostname: null,
      user: null,
      port: null,
      identityFile: null
    };

    const flush = () => {
      for (const alias of currentAliases) {
        if (/[*?]/.test(alias)) {
          continue;
        }
        hosts.push({
          alias,
          ...currentValues
        });
      }
    };

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const [rawKey, ...valueParts] = trimmed.split(/\s+/);
      const key = rawKey.toLowerCase();
      const value = valueParts.join(" ").trim();
      if (!value) {
        continue;
      }

      if (key === "host") {
        flush();
        currentAliases = value.split(/\s+/).filter(Boolean);
        currentValues = {
          hostname: null,
          user: null,
          port: null,
          identityFile: null
        };
        continue;
      }

      if (!currentAliases.length) {
        continue;
      }

      if (key === "hostname") {
        currentValues.hostname = value;
      } else if (key === "user") {
        currentValues.user = value;
      } else if (key === "port") {
        const port = Number.parseInt(value, 10);
        currentValues.port = Number.isFinite(port) ? port : null;
      } else if (key === "identityfile") {
        currentValues.identityFile = expandSshPath(value);
      }
    }

    flush();

    return hosts.sort((left, right) => left.alias.localeCompare(right.alias));
  } catch {
    return [];
  }
}

function escapeUncSegment(value: string): string {
  return value.replace(/\//g, "\\").replace(/^\\+/, "").replace(/\\+/g, "\\");
}

function buildWindowsSshfsUnc(payload: ConnectRemoteProjectPayload): string {
  const remoteUser = (payload.user || "").trim();
  if (!remoteUser) {
    throw new Error("A remote SSH user is required for SSHFS-Win mounts.");
  }
  const userPrefix = `${remoteUser}@`;
  const portSuffix = payload.port ? `!${payload.port}` : "";
  const normalizedPath = payload.remotePath.trim().replace(/\\/g, "/");
  const isAbsolutePath = normalizedPath.startsWith("/");
  const provider = isAbsolutePath ? "sshfs.kr" : "sshfs.k";
  const remotePath = normalizedPath ? `\\${escapeUncSegment(normalizedPath)}` : "";
  return `\\\\${provider}\\${userPrefix}${payload.host}${portSuffix}${remotePath}`;
}

function buildWindowsSshfsSvcPrefix(payload: ConnectRemoteProjectPayload): string {
  return buildWindowsSshfsUnc(payload).replace(/^\\\\/, "\\");
}

function parseWindowsActiveMount(remote: string): ActiveRemoteMount {
  const trimmed = remote.trim();
  const match = trimmed.match(/^\\\\sshfs\.k[r]?\\(?:(.+?)@)?([^!\\]+)(?:!(\d+))?(?:\\(.*))?$/i);
  return {
    remote: trimmed,
    localMount: null,
    user: match?.[1] || null,
    host: match?.[2] || null,
    port: match?.[3] ? Number.parseInt(match[3], 10) : null,
    remotePath: match?.[4] ? `/${match[4].replace(/\\/g, "/")}` : null,
    alias: match?.[2] || null
  };
}

async function findAvailableDriveLetter(): Promise<string> {
  const blocked = new Set<string>();
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    try {
      await fs.access(`${letter}:\\`);
      blocked.add(letter);
    } catch {
      continue;
    }
  }

  for (const letter of ["Z", "Y", "X", "W", "V", "U", "T", "S", "R", "Q", "P", "O", "N", "M"]) {
    if (!blocked.has(letter)) {
      return `${letter}:`;
    }
  }

  throw new Error("No free drive letter is available for an SSH mount.");
}

function normalizeWindowsMountTarget(mountPoint: string): string {
  return mountPoint.replace(/[\\/]+$/, "");
}

async function isWindowsMountStillActive(mountPoint: string): Promise<boolean> {
  const normalizedTarget = `${normalizeWindowsMountTarget(mountPoint)}\\`.toLowerCase();
  const activeMounts = await windowsAdapter.readActiveMounts();
  return activeMounts.some((mount) => (mount.localMount || "").toLowerCase() === normalizedTarget);
}

const windowsAdapter: RemoteMountAdapter = {
  detectSupport: async () => {
    const sshfsPath = await findWindowsSshfsExecutable();
    const wingetPath = await findWingetExecutable();
    if (sshfsPath) {
      return {
        supported: true,
        provider: "sshfs-win",
        reason: null,
        installHint: null,
        canAutoInstall: false,
        bootstrapScript: buildWindowsSshAgentSetupScript()
      };
    }

    return {
      supported: false,
      provider: null,
      reason: "SSHFS-Win is not installed, so Nora cannot mount an SSH host yet.",
      installHint: wingetPath
        ? "Install WinFsp and SSHFS-Win from Nora, then run the ssh-agent setup script below."
        : "Install WinFsp and SSHFS-Win, then run the ssh-agent setup script below.",
      canAutoInstall: wingetPath !== null,
      bootstrapScript: buildWindowsSshAgentSetupScript()
    };
  },
  readActiveMounts: async () => {
    try {
      const { stdout } = await execFileAsync("cmd", ["/c", "net use"], {
        windowsHide: true,
        maxBuffer: 1024 * 1024
      });

      return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.includes("\\\\sshfs."))
        .map((line) => {
          const columns = line.split(/\s{2,}/).filter(Boolean);
          const localCandidate = columns.find((column) => /^[A-Z]:$/i.test(column)) || null;
          const remoteCandidate = columns.find((column) => column.startsWith("\\\\sshfs.")) || "";
          return {
            ...parseWindowsActiveMount(remoteCandidate),
            localMount: localCandidate ? `${localCandidate}\\` : null
          } satisfies ActiveRemoteMount;
        });
    } catch {
      return [];
    }
  },
  mount: async (payload, reporter) => {
    const resolvedPayload = await resolveRemotePayload(payload);
    const driveLetter = await findAvailableDriveLetter();
    const unc = buildWindowsSshfsUnc(resolvedPayload);
    const sshfsExecutable = await findWindowsSshfsExecutable();
    if (!sshfsExecutable) {
      throw new Error("SSHFS-Win is not installed or could not be found on PATH.");
    }

    reporter?.("Verifying SSH connectivity...");
    await verifySshConnectivity(resolvedPayload, reporter);
    reporter?.(`Mounting ${unc} to ${driveLetter}\\ ...`);

    try {
      reporter?.("Trying standard Windows mapped-drive mount...");
      await runCommandWithStreaming("net", ["use", driveLetter, unc, "/persistent:no"], {
        timeoutMs: 20000,
        reporter
      });
    } catch (error) {
      reporter?.(`Standard mapped-drive mount failed: ${toErrorMessage(error, "Unknown error.")}`);
      reporter?.("Falling back to SSHFS-Win service mount...");
      try {
        await runCommandWithStreaming(sshfsExecutable, ["svc", buildWindowsSshfsSvcPrefix(resolvedPayload), driveLetter], {
          timeoutMs: 20000,
          reporter
        });
      } catch (svcError) {
        throw new Error(toErrorMessage(svcError, "SSH mount failed."));
      }
    }

    return {
      mountPoint: `${driveLetter}\\`,
      mountedUnc: unc
    };
  },
  unmount: async (mountPoint) => {
    const target = normalizeWindowsMountTarget(mountPoint);
    const failures: string[] = [];
    const powershell = await findPowerShellExecutable();
    const attempts: Array<() => Promise<void>> = [
      async () => {
        await execFileAsync("net", ["use", target, "/delete", "/y"], {
          windowsHide: true,
          maxBuffer: 1024 * 1024
        });
      }
    ];

    if (powershell) {
      attempts.push(async () => {
        await execFileAsync(
          powershell,
          [
            "-NoProfile",
            "-Command",
            `(New-Object -ComObject WScript.Network).RemoveNetworkDrive('${target}', $true, $true)`
          ],
          {
            windowsHide: true,
            maxBuffer: 1024 * 1024
          }
        );
      });
      attempts.push(async () => {
        await execFileAsync(
          powershell,
          [
            "-NoProfile",
            "-Command",
            `if (Get-Command Remove-SmbMapping -ErrorAction SilentlyContinue) { Remove-SmbMapping -LocalPath '${target}' -Force -UpdateProfile:$false }`
          ],
          {
            windowsHide: true,
            maxBuffer: 1024 * 1024
          }
        );
      });
    }
    attempts.push(async () => {
      await execFileAsync("mountvol", [target, "/d"], {
        windowsHide: true,
        maxBuffer: 1024 * 1024
      });
    });

    for (const attempt of attempts) {
      try {
        await attempt();
        if (!(await isWindowsMountStillActive(target))) {
          return;
        }
      } catch (error) {
        failures.push(toErrorMessage(error, `Failed to unmount ${target}.`));
      }
    }

    if (!(await isWindowsMountStillActive(target))) {
      return;
    }

    throw new Error(failures[0] || `Failed to unmount ${target}.`);
  }
};

function parsePosixMountSource(source: string, mountPoint: string): ActiveRemoteMount {
  const trimmed = source.trim();
  const withPathMatch = trimmed.match(/^(?:(.+?)@)?([^:]+):(.+)$/);
  const aliasWithHomeMatch = trimmed.match(/^(?:(.+?)@)?([^:]+):$/);
  const hostOnlyMatch = trimmed.match(/^(?:(.+?)@)?([^:]+)$/);
  const alias = withPathMatch?.[2] || aliasWithHomeMatch?.[2] || hostOnlyMatch?.[2] || null;

  return {
    remote: trimmed,
    localMount: mountPoint,
    user: withPathMatch?.[1] || aliasWithHomeMatch?.[1] || hostOnlyMatch?.[1] || null,
    host: withPathMatch?.[2] || aliasWithHomeMatch?.[2] || hostOnlyMatch?.[2] || null,
    port: null,
    remotePath: withPathMatch?.[3] || (aliasWithHomeMatch ? "~" : null),
    alias
  };
}

function collectMountedTargetsFromOutput(output: string): Map<string, string> {
  const mounts = new Map<string, string>();
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const macMatch = trimmed.match(/^(.*?) on (.*?) \((.*?)\)$/);
    if (macMatch) {
      const [, source, mountPoint, details] = macMatch;
      if (details.toLowerCase().includes("sshfs") || details.toLowerCase().includes("macfuse")) {
        mounts.set(mountPoint, source);
      }
      continue;
    }

    const linuxMatch = trimmed.match(/^(.*?) on (.*?) type (.*?) \((.*?)\)$/);
    if (linuxMatch) {
      const [, source, mountPoint, type] = linuxMatch;
      if (type.toLowerCase().includes("sshfs") || type.toLowerCase().includes("fuse.sshfs")) {
        mounts.set(mountPoint, source);
      }
      continue;
    }

    const procMatch = trimmed.match(/^(\S+)\s+(\S+)\s+(\S+)(?:\s+.*)?$/);
    if (procMatch) {
      const [, source, mountPoint, type] = procMatch;
      if (type.toLowerCase().includes("sshfs") || type.toLowerCase().includes("fuse.sshfs")) {
        mounts.set(mountPoint.replace(/\\040/g, " "), source.replace(/\\040/g, " "));
      }
    }
  }
  return mounts;
}

async function readPosixMountedTargets(): Promise<Map<string, string>> {
  const readers: Array<() => Promise<Map<string, string>>> = [
    async () => {
      const { stdout } = await execFileAsync("mount", [], {
        windowsHide: true,
        maxBuffer: 1024 * 1024
      });
      return collectMountedTargetsFromOutput(stdout);
    }
  ];

  if (!isMac()) {
    readers.unshift(async () => {
      const { stdout } = await execFileAsync("findmnt", ["-rn", "-t", "fuse.sshfs,sshfs", "-o", "TARGET,SOURCE,FSTYPE"], {
        windowsHide: true,
        maxBuffer: 1024 * 1024
      });
      const normalized = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [target, source, type] = line.split(/\s+/, 3);
          return source && target && type ? `${source} ${target} ${type}` : "";
        })
        .filter(Boolean)
        .join("\n");
      return collectMountedTargetsFromOutput(normalized);
    });
    readers.push(async () => {
      const raw = await fs.readFile("/proc/mounts", "utf8");
      return collectMountedTargetsFromOutput(raw);
    });
  }

  for (const read of readers) {
    try {
      const mounts = await read();
      if (mounts.size > 0) {
        return mounts;
      }
    } catch {
      continue;
    }
  }

  return new Map<string, string>();
}

const posixAdapter: RemoteMountAdapter = {
  detectSupport: async () => {
    const sshfsPath = await findPosixSshfsExecutable();
    const hasUnmountTool = (await findPosixUnmountExecutable()) !== null || (isMac() && (await findMacDiskUtilExecutable()) !== null);
    if (sshfsPath && hasUnmountTool) {
      return {
        supported: true,
        provider: "sshfs",
        reason: null,
        installHint: null,
        canAutoInstall: false,
        bootstrapScript: null
      };
    }

    return {
      supported: false,
      provider: null,
      reason: !sshfsPath
        ? "The sshfs command is not installed, so Nora cannot mount an SSH host yet."
        : "A compatible FUSE unmount tool was not found, so Nora cannot manage SSH mounts reliably yet.",
      installHint: isMac()
        ? "Install macFUSE and sshfs, then reopen this dialog."
        : !sshfsPath
        ? "Install sshfs, then reopen this dialog."
        : "Install fuse/sshfs tools such as fusermount3, then reopen this dialog.",
      canAutoInstall: false,
      bootstrapScript: null
    };
  },
  readActiveMounts: async () => {
    const mountedTargets = await readPosixMountedTargets();
    const parsed = Array.from(mountedTargets.entries())
      .map(([mountPoint, source]) => parsePosixMountSource(source, mountPoint));
    const resolved = await Promise.all(
      parsed.map(async (mount) => {
        if (!mount.host || !mount.remotePath) {
          return mount;
        }

        const payload = await resolveRemotePayload({
          host: mount.host,
          user: mount.user || undefined,
          port: mount.port,
          remotePath: mount.remotePath,
          connectionMode: "mount"
        });

        return {
          ...mount,
          host: payload.host,
          user: payload.user || null,
          port: payload.port ?? null,
          remotePath: payload.remotePath,
          alias: mount.alias || mount.host
        } satisfies ActiveRemoteMount;
      })
    );

    return resolved.sort((left, right) => (left.localMount || "").localeCompare(right.localMount || ""));
  },
  mount: async (payload, reporter) => {
    const sshfsExecutable = await findPosixSshfsExecutable();
    if (!sshfsExecutable) {
      throw new Error("The sshfs command is not installed or could not be found on PATH.");
    }

    reporter?.("Verifying SSH connectivity...");
    await verifySshConnectivity(payload, reporter);

    const mountPoint = getManagedPosixMountPath(payload);
    const existingMounts = await posixAdapter.readActiveMounts();
    const existing = existingMounts.find((mount) => mount.localMount === mountPoint);
    if (existing) {
      reporter?.(`Reusing existing mount at ${mountPoint}`);
      return {
        mountPoint,
        mountedUnc: existing.remote
      };
    }

    await fs.mkdir(mountPoint, { recursive: true });

    const args = [formatSshTarget(payload), mountPoint];
    if (payload.port) {
      args.push("-p", String(payload.port));
    }

    const options = [
      "reconnect",
      "StrictHostKeyChecking=accept-new",
      "ServerAliveInterval=15",
      "ServerAliveCountMax=3"
    ];
    if (isMac()) {
      options.push("defer_permissions");
      options.push(`volname=Nora ${payload.host.trim()}`);
    } else {
      options.push("follow_symlinks");
      options.push("idmap=user");
    }
    if (options.length) {
      args.push("-o", options.join(","));
    }
    reporter?.(`Mounting ${formatSshTarget(payload)} to ${mountPoint} ...`);

    try {
      await runCommandWithStreaming(sshfsExecutable, args, {
        timeoutMs: 20000,
        reporter
      });
    } catch (error) {
      throw new Error(toErrorMessage(error, "SSH mount failed."));
    }

    return {
      mountPoint,
      mountedUnc: formatSshTarget(payload)
    };
  },
  unmount: async (mountPoint) => {
    const normalized = mountPoint.replace(/[\\/]+$/, "");
    const commands: Array<[string, string[]]> = isMac()
      ? [["umount", [normalized]], ["diskutil", ["unmount", "force", normalized]]]
      : [["fusermount3", ["-u", normalized]], ["fusermount", ["-u", normalized]], ["umount", [normalized]]];
    const failures: string[] = [];

    for (const [command, args] of commands) {
      try {
        await execFileAsync(command, args, {
          windowsHide: true,
          maxBuffer: 1024 * 1024
        });
        return;
      } catch (error) {
        failures.push(toErrorMessage(error, `${command} failed.`));
        continue;
      }
    }

    throw new Error(failures[0] || `Failed to unmount ${normalized}.`);
  }
};

function getAdapter(): RemoteMountAdapter {
  return isWindows() ? windowsAdapter : posixAdapter;
}

async function installWindowsRemoteMountSupport(reporter?: RemoteMountReporter): Promise<void> {
  const wingetPath = await findWingetExecutable();
  if (!wingetPath) {
    throw new Error("winget is not available on this machine, so Nora cannot auto-install WinFsp and SSHFS-Win.");
  }

  const powerShell = await findPowerShellExecutable();
  if (!powerShell) {
    throw new Error("PowerShell could not be found, so Nora cannot run the Windows SSHFS bootstrap.");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "nora-sshfs-install-"));
  const scriptPath = path.join(tempDir, "install-remote-mount-support.ps1");
  const logPath = path.join(tempDir, "install-remote-mount-support.log");

  await fs.writeFile(scriptPath, buildWindowsRemoteMountInstallScript(logPath), "utf8");

  reporter?.("Preparing WinFsp and SSHFS-Win installation...");
  reporter?.("Windows will prompt for administrator approval.");

  try {
    const launchCommand =
      `$proc = Start-Process -FilePath '${escapePowerShellSingleQuoted(powerShell)}' ` +
      `-Verb RunAs -Wait -PassThru -ArgumentList @(` +
      `'-NoProfile','-ExecutionPolicy','Bypass','-File','${escapePowerShellSingleQuoted(scriptPath)}'` +
      `); exit $proc.ExitCode`;

    await runCommandWithStreaming(powerShell, ["-NoProfile", "-Command", launchCommand], {
      timeoutMs: 15 * 60 * 1000,
      reporter
    });

    try {
      const log = await fs.readFile(logPath, "utf8");
      reportOutput(reporter, log);
    } catch {
      reporter?.("Installation completed.");
    }
  } finally {
    await Promise.allSettled([
      fs.rm(scriptPath, { force: true }),
      fs.rm(logPath, { force: true }),
      fs.rm(tempDir, { recursive: true, force: true })
    ]);
  }
}

export async function getRemoteConnectionOptions(): Promise<RemoteConnectionOptions> {
  const adapter = getAdapter();
  return {
    support: await adapter.detectSupport(),
    directSsh: await detectDirectSshSupport(),
    hosts: await readSshConfigHosts(),
    activeMounts: await adapter.readActiveMounts()
  };
}

export async function detectRemoteMountSupport(): Promise<RemoteMountSupport> {
  return getAdapter().detectSupport();
}

export async function installRemoteMountSupport(reporter?: RemoteMountReporter): Promise<RemoteConnectionOptions> {
  if (!isWindows()) {
    throw new Error("Automatic remote mount dependency installation is only supported on Windows.");
  }

  await installWindowsRemoteMountSupport(reporter);
  return getRemoteConnectionOptions();
}

export async function readActiveRemoteMounts(): Promise<ActiveRemoteMount[]> {
  return getAdapter().readActiveMounts();
}

export async function mountRemoteWorkspace(
  payload: ConnectRemoteProjectPayload,
  reporter?: RemoteMountReporter
): Promise<MountResult> {
  return getAdapter().mount(payload, reporter);
}

export async function unmountRemoteWorkspace(mountPoint: string): Promise<void> {
  return getAdapter().unmount(mountPoint);
}
