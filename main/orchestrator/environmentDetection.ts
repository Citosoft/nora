import { isAgentToolEnabled } from "@shared/agentToolState";
import type { AgentCatalogEntry, AgentDetectionInfo, AgentToolConfig, TerminalShellOption } from "@shared/appTypes";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { AGENT_DEFINITIONS } from "../agentCatalog";
import type { AgentExecutablePathCandidate } from "../types/internal.types";
import { buildProcessEnv } from "../processEnv";
import { getExecStderr, getExecStdout } from "./execErrors";
import { getShell, isWindows } from "./shell";

const execFileAsync = promisify(execFile);
let resolvedGitExecutablePromise: Promise<string | null> | null = null;

function isCodexDesktopAppBinaryPath(resolvedPath: string): boolean {
  const normalized = resolvedPath.replace(/\\/g, "/").toLowerCase();
  return normalized.includes(".app/contents/macos/") && normalized.endsWith("/codex");
}

function emptyAgentDetectionInfo(id: string): AgentDetectionInfo {
  return {
    id,
    detected: false,
    detectedCommand: null,
    detectedPath: null,
    detectionProbe: null,
    detectionStdout: null,
    detectionStderr: null
  };
}

export function createUndetectedLocalAgentDetections(): AgentDetectionInfo[] {
  return AGENT_DEFINITIONS.map((tool) => emptyAgentDetectionInfo(tool.id));
}

async function commandInfoForAliases(
  aliases: string[],
  executablePathCandidates: AgentExecutablePathCandidate[] = [],
  findExistingPath: (paths: string[]) => Promise<string | null> | string | null,
  acceptResolvedPath?: (resolvedPath: string) => boolean
): Promise<Pick<AgentCatalogEntry, "detected" | "detectedCommand" | "detectedPath" | "detectionProbe" | "detectionStdout" | "detectionStderr">> {
  let lastProbe: string | null = null;
  let lastStdout: string | null = null;
  let lastStderr: string | null = null;

  const resolvedPathCandidates = resolveExecutablePathCandidates(executablePathCandidates);
  if (resolvedPathCandidates.length) {
    const candidatePath = await findExistingPath(resolvedPathCandidates);
    if (candidatePath) {
      return {
        detected: true,
        detectedCommand: candidatePath,
        detectedPath: candidatePath,
        detectionProbe: resolvedPathCandidates.join(" || "),
        detectionStdout: candidatePath,
        detectionStderr: null
      };
    }
  }

  if (!isWindows() && aliases.length > 1) {
    const compoundProbe = aliases.map((alias) => `command -v ${alias}`).join(" || ");
    lastProbe = compoundProbe;
    try {
      const result = await execFileAsync(getShell(), ["-lc", compoundProbe], {
        cwd: process.cwd(),
        env: buildProcessEnv(process.env)
      });
      const stdout = result.stdout.trim();
      const stderr = result.stderr.trim();
      lastStdout = stdout || null;
      lastStderr = stderr || null;
      const resolvedCandidates = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const resolved = resolvedCandidates.find((candidate) => (acceptResolvedPath ? acceptResolvedPath(candidate) : true)) ?? "";
      if (resolved) {
        const matchedAlias = aliases.find((alias) => resolved.endsWith(`/${alias}`) || resolved.endsWith(`\\${alias}`)) ?? aliases[0] ?? null;
        return {
          detected: true,
          detectedCommand: matchedAlias,
          detectedPath: resolved,
          detectionProbe: compoundProbe,
          detectionStdout: stdout || null,
          detectionStderr: stderr || null
        };
      }
    } catch (error: unknown) {
      lastStdout = getExecStdout(error).trim() || null;
      lastStderr = getExecStderr(error).trim() || null;
    }
  } else {
    for (const alias of aliases) {
      const probe = isWindows() ? `where ${alias}` : `command -v ${alias}`;
      lastProbe = probe;
      try {
        const result = isWindows()
          ? await execFileAsync("where", [alias], {
              cwd: process.cwd(),
              env: buildProcessEnv(process.env)
            })
          : await execFileAsync(getShell(), ["-lc", probe], {
              cwd: process.cwd(),
              env: buildProcessEnv(process.env)
            });
        const stdout = result.stdout.trim();
        const stderr = result.stderr.trim();
        lastStdout = stdout || null;
        lastStderr = stderr || null;
        const resolvedCandidates = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const resolved = resolvedCandidates.find((candidate) => (acceptResolvedPath ? acceptResolvedPath(candidate) : true)) ?? "";
        if (resolved) {
          return {
            detected: true,
            detectedCommand: alias,
            detectedPath: resolved,
            detectionProbe: probe,
            detectionStdout: stdout || null,
            detectionStderr: stderr || null
          };
        }
      } catch (error: unknown) {
        lastStdout = getExecStdout(error).trim() || null;
        lastStderr = getExecStderr(error).trim() || null;
        continue;
      }
    }
  }

  return {
    detected: false,
    detectedCommand: null,
    detectedPath: null,
    detectionProbe:
      lastProbe ||
      (aliases.length ? (isWindows() ? aliases.map((alias) => `where ${alias}`).join(" || ") : aliases.map((alias) => `command -v ${alias}`).join(" || ")) : null),
    detectionStdout: lastStdout,
    detectionStderr: lastStderr
  };
}

function resolveExecutablePathCandidates(candidates: AgentExecutablePathCandidate[]): string[] {
  const platform = process.platform;
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const userProfileDir = process.env.USERPROFILE || "";
  const localAppDataDir = process.env.LOCALAPPDATA || "";
  const appDataDir = process.env.APPDATA || "";

  return candidates
    .filter((candidate) => !candidate.platforms || candidate.platforms.includes(platform))
    .map((candidate) =>
      candidate.path
        .replace(/^~(?=$|[\\/])/, homeDir)
        .replace(/\$HOME(?=$|[\\/])/g, homeDir)
        .replace(/%USERPROFILE%/gi, userProfileDir)
        .replace(/%LOCALAPPDATA%/gi, localAppDataDir)
        .replace(/%APPDATA%/gi, appDataDir)
    )
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

export async function findGitExecutable(
  findExistingPath: (paths: string[]) => Promise<string | null> | string | null,
  findExecutableOnPath: (aliases: string[], windows: boolean) => Promise<string | null> | string | null
): Promise<string | null> {
  if (!resolvedGitExecutablePromise) {
    resolvedGitExecutablePromise = (async () => {
      if (isWindows()) {
        return await findExistingPath([
          "C:\\Program Files\\Git\\cmd\\git.exe",
          "C:\\Program Files\\Git\\bin\\git.exe",
          "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
          "C:\\Program Files (x86)\\Git\\bin\\git.exe"
        ]) || await findExecutableOnPath(["git.exe", "git"], true);
      }

      return await findExistingPath([
        "/usr/bin/git",
        "/usr/local/bin/git",
        "/opt/homebrew/bin/git"
      ]) || await findExecutableOnPath(["git"], false);
    })();
  }

  return resolvedGitExecutablePromise;
}

export function buildAgentCatalog(
  detections: AgentDetectionInfo[],
  priorCatalog: AgentCatalogEntry[],
  toolConfigs: Record<string, AgentToolConfig>
): AgentCatalogEntry[] {
  const detectionsById = new Map(detections.map((entry) => [entry.id, entry]));

  return AGENT_DEFINITIONS.map((tool) => {
    const detected = detectionsById.get(tool.id) || emptyAgentDetectionInfo(tool.id);
    const prior = priorCatalog.find((item) => item.id === tool.id);
    const config = toolConfigs[tool.id] || {
      values: {},
      updatedAt: null
    };

    return {
      ...tool,
      detected: detected.detected,
      enabled: isAgentToolEnabled(config),
      detectedCommand: detected.detectedCommand,
      detectedPath: detected.detectedPath,
      detectionProbe: detected.detectionProbe,
      detectionStdout: detected.detectionStdout,
      detectionStderr: detected.detectionStderr,
      installStatus: prior?.installStatus || "idle",
      installLog: prior?.installLog || [],
      config
    };
  });
}

export async function detectLocalAgentCatalog(
  findExistingPath: (paths: string[]) => Promise<string | null> | string | null
): Promise<AgentDetectionInfo[]> {
  return Promise.all(
    AGENT_DEFINITIONS.map(async (tool) => {
      const detected = await commandInfoForAliases(
        tool.aliases,
        tool.executablePathCandidates,
        findExistingPath,
        tool.id === "codex" ? (resolvedPath) => !isCodexDesktopAppBinaryPath(resolvedPath) : undefined
      );
      return {
        id: tool.id,
        detected: detected.detected,
        detectedCommand: detected.detectedCommand,
        detectedPath: detected.detectedPath,
        detectionProbe: detected.detectionProbe,
        detectionStdout: detected.detectionStdout,
        detectionStderr: detected.detectionStderr
      };
    })
  );
}

export async function detectTerminalShells(): Promise<TerminalShellOption[]> {
  if (isWindows()) {
    const options: TerminalShellOption[] = [];
    const seen = new Set<string>();
    const addIfPresent = async (id: string, label: string, executable: string): Promise<void> => {
      try {
        await fs.access(executable);
        if (!seen.has(executable.toLowerCase())) {
          seen.add(executable.toLowerCase());
          options.push({ id, label, executable });
        }
      } catch {
        // ignore missing shell
      }
    };

    const systemRoot = process.env.SystemRoot || "C:\\Windows";
    await addIfPresent("pwsh", "PowerShell 7", path.join(process.env.ProgramFiles || "C:\\Program Files", "PowerShell", "7", "pwsh.exe"));
    await addIfPresent("powershell", "Windows PowerShell", path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"));
    await addIfPresent("cmd", "Command Prompt", process.env.ComSpec || path.join(systemRoot, "System32", "cmd.exe"));
    await addIfPresent("git-bash", "Git Bash", "C:\\Program Files\\Git\\bin\\bash.exe");
    await addIfPresent("git-bash-x86", "Git Bash", "C:\\Program Files (x86)\\Git\\bin\\bash.exe");
    return options;
  }

  const shells: TerminalShellOption[] = [];
  const seen = new Set<string>();
  const candidates = [
    { id: "system", label: "System Shell", executable: getShell() },
    { id: "bash", label: "Bash", executable: "/bin/bash" },
    { id: "zsh", label: "Zsh", executable: "/bin/zsh" },
    { id: "sh", label: "sh", executable: "/bin/sh" }
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate.executable);
      if (!seen.has(candidate.executable)) {
        seen.add(candidate.executable);
        shells.push(candidate);
      }
    } catch {
      // ignore missing shell
    }
  }

  return shells;
}

export async function commandInfoForAliasesOnRemoteTarget(
  aliases: string[],
  runRemoteSshCommand: (command: string) => Promise<{ stdout: string; stderr: string }>,
  wrapRemoteLoginShellCommand: (command: string) => string,
  shellQuote: (value: string) => string
): Promise<Pick<AgentCatalogEntry, "detected" | "detectedCommand" | "detectedPath" | "detectionProbe" | "detectionStdout" | "detectionStderr">> {
  let lastProbe: string | null = null;
  let lastStdout: string | null = null;
  let lastStderr: string | null = null;

  for (const alias of aliases) {
    const rawProbe = `command -v ${shellQuote(alias)} 2>/dev/null || which ${shellQuote(alias)} 2>/dev/null`;
    const probe = wrapRemoteLoginShellCommand(rawProbe);
    lastProbe = probe;
    try {
      const { stdout, stderr } = await runRemoteSshCommand(probe);
      lastStdout = stdout.trim() || null;
      lastStderr = stderr.trim() || null;
      const resolved = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean) ?? "";
      if (resolved) {
        return {
          detected: true,
          detectedCommand: alias,
          detectedPath: resolved,
          detectionProbe: probe,
          detectionStdout: stdout.trim() || null,
          detectionStderr: stderr.trim() || null
        };
      }
    } catch (error: unknown) {
      lastStdout = getExecStdout(error).trim() || null;
      lastStderr = getExecStderr(error).trim() || null;
      continue;
    }
  }

  return {
    detected: false,
    detectedCommand: null,
    detectedPath: null,
    detectionProbe:
      lastProbe ||
      (aliases.length
        ? wrapRemoteLoginShellCommand(
            aliases.map((alias) => `command -v ${shellQuote(alias)} 2>/dev/null || which ${shellQuote(alias)} 2>/dev/null`).join(" || ")
          )
        : null),
    detectionStdout: lastStdout,
    detectionStderr: lastStderr
  };
}

export async function detectRemoteAgentCatalog(
  runRemoteSshCommand: (command: string) => Promise<{ stdout: string; stderr: string }>,
  wrapRemoteLoginShellCommand: (command: string) => string,
  shellQuote: (value: string) => string
): Promise<AgentDetectionInfo[]> {
  return Promise.all(
    AGENT_DEFINITIONS.map(async (tool) => {
      const detected = await commandInfoForAliasesOnRemoteTarget(
        tool.aliases,
        runRemoteSshCommand,
        wrapRemoteLoginShellCommand,
        shellQuote
      );
      return {
        id: tool.id,
        detected: detected.detected,
        detectedCommand: detected.detectedCommand,
        detectedPath: detected.detectedPath,
        detectionProbe: detected.detectionProbe,
        detectionStdout: detected.detectionStdout,
        detectionStderr: detected.detectionStderr
      };
    })
  );
}
