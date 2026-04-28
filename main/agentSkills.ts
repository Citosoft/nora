import type {
  AgentSkillCatalog,
  AgentSkillEntry,
  AgentSkillSearchMatch,
  AgentSkillSearchResult
} from "@shared/appTypes";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  getAgentSkillCatalogConfig,
  getSharedAgentSkillCatalogConfig,
  SHARED_AGENT_SKILLS_TOOL_ID,
  type AgentSkillCatalogConfig
} from "./agentCatalog";
import { buildProcessEnv } from "./processEnv";
import { findExecutableOnPath, findExistingPath } from "./processLookup";
import type {
  SkillInstallReporter,
  SkillsCommandCandidate,
  SkillsCommandExecution
} from "./types/internal.types";

const execFileAsync = promisify(execFile);

function nowIso(): string {
  return new Date().toISOString();
}

function isWindows(): boolean {
  return process.platform === "win32";
}

function getCodexHome(): string {
  const configured = (process.env.CODEX_HOME || "").trim();
  return configured || path.join(os.homedir(), ".codex");
}

function getSkillsNpmCacheDir(): string {
  return path.join(os.tmpdir(), "nora-skills-npm-cache");
}

function resolveConfiguredRootPath(rootDir: string): string {
  if (rootDir.startsWith("~/") || rootDir.startsWith("~\\")) {
    return path.join(os.homedir(), rootDir.slice(2));
  }
  if (path.isAbsolute(rootDir)) {
    return rootDir;
  }

  return path.join(getCodexHome(), rootDir.replace(/^[./\\]+/, ""));
}

function getSkillCatalogConfig(toolId: string): AgentSkillCatalogConfig | null {
  if (toolId === SHARED_AGENT_SKILLS_TOOL_ID) {
    return getSharedAgentSkillCatalogConfig();
  }

  return getAgentSkillCatalogConfig(toolId);
}

function shellQuote(value: string): string {
  if (isWindows()) {
    if (!value.length) {
      return "\"\"";
    }
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function shellCommandQuote(value: string): string {
  if (!value.length) {
    return "\"\"";
  }

  const escaped = value.replace(/"/g, "\"\"");
  return /[\s&()[\]{}^=;!'+,`~|<>]/.test(value) ? `"${escaped}"` : escaped;
}

function buildShellCommand(executable: string, args: string[]): string {
  return [shellCommandQuote(executable), ...args.map((arg) => shellCommandQuote(arg))].join(" ").trim();
}

async function runShellCommand(
  command: string,
  env: NodeJS.ProcessEnv
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(command, {
      cwd: process.cwd(),
      env,
      shell: true,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const error = new Error(`Command exited with code ${code ?? 1}.`);
      Object.assign(error, { code, stdout, stderr });
      reject(error);
    });
  });
}

function formatDisplayCommand(executableLabel: string, args: string[]): string {
  return [executableLabel, ...args.map((arg) => shellQuote(arg))].join(" ").trim();
}

function shouldUseWindowsCmdWrapper(executable: string): boolean {
  if (!isWindows()) {
    return false;
  }

  const normalized = executable.toLowerCase();
  return normalized.endsWith(".cmd") || normalized.endsWith(".bat");
}

function isCommandNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : null;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return code === "ENOENT" || /spawn .+ ENOENT/i.test(message);
}

async function getPreferredSkillsCommands(): Promise<SkillsCommandCandidate[]> {
  if (isWindows()) {
    const systemDrive = process.env.SystemDrive || "C:";
    const programFiles = process.env.ProgramFiles || `${systemDrive}\\Program Files`;
    const programFilesX86 = process.env["ProgramFiles(x86)"] || `${systemDrive}\\Program Files (x86)`;
    const nodePaths = [
      path.join(programFiles, "nodejs", "skills.cmd"),
      path.join(programFiles, "nodejs", "skills.exe"),
      path.join(programFiles, "nodejs", "npx.cmd"),
      path.join(programFiles, "nodejs", "npx.exe"),
      path.join(programFiles, "nodejs", "npm.cmd"),
      path.join(programFiles, "nodejs", "npm.exe"),
      path.join(programFilesX86, "nodejs", "skills.cmd"),
      path.join(programFilesX86, "nodejs", "skills.exe"),
      path.join(programFilesX86, "nodejs", "npx.cmd"),
      path.join(programFilesX86, "nodejs", "npx.exe"),
      path.join(programFilesX86, "nodejs", "npm.cmd"),
      path.join(programFilesX86, "nodejs", "npm.exe")
    ];
    const discovered = await Promise.all([
      findExecutableOnPath(["skills.cmd", "skills.exe", "skills"], true),
      findExecutableOnPath(["npx.cmd", "npx.exe", "npx"], true),
      findExecutableOnPath(["npm.cmd", "npm.exe", "npm"], true),
      findExistingPath(nodePaths.filter((candidate) => /skills\.(cmd|exe)$/i.test(candidate))),
      findExistingPath(nodePaths.filter((candidate) => /npx\.(cmd|exe)$/i.test(candidate))),
      findExistingPath(nodePaths.filter((candidate) => /npm\.(cmd|exe)$/i.test(candidate)))
    ]);

    const skillsExecutable = discovered[0] || discovered[3];
    const npxExecutable = discovered[1] || discovered[4];
    const npmExecutable = discovered[2] || discovered[5];

    return [
      ...(skillsExecutable ? [{ label: "skills", executable: skillsExecutable, argsPrefix: [] }] : []),
      ...(npxExecutable ? [{ label: "npx skills", executable: npxExecutable, argsPrefix: ["skills"] }] : []),
      ...(npmExecutable ? [{ label: "npm exec skills", executable: npmExecutable, argsPrefix: ["exec", "--yes", "skills", "--"] }] : [])
    ];
  }

  const skillsExecutable =
    await findExecutableOnPath(["skills"], false) ||
    await findExistingPath(["/usr/local/bin/skills", "/opt/homebrew/bin/skills", "/usr/bin/skills"]);
  const npxExecutable =
    await findExecutableOnPath(["npx"], false) ||
    await findExistingPath(["/usr/local/bin/npx", "/opt/homebrew/bin/npx", "/usr/bin/npx"]);
  const npmExecutable =
    await findExecutableOnPath(["npm"], false) ||
    await findExistingPath(["/usr/local/bin/npm", "/opt/homebrew/bin/npm", "/usr/bin/npm"]);

  return [
    ...(skillsExecutable ? [{ label: "skills", executable: skillsExecutable, argsPrefix: [] }] : []),
    ...(npxExecutable ? [{ label: "npx skills", executable: npxExecutable, argsPrefix: ["skills"] }] : []),
    ...(npmExecutable ? [{ label: "npm exec skills", executable: npmExecutable, argsPrefix: ["exec", "--yes", "skills", "--"] }] : [])
  ];
}

export function buildSkillsCommandEnv(
  baseEnv: NodeJS.ProcessEnv,
  npmCacheDir: string,
  options?: {
    platform?: NodeJS.Platform;
  }
): NodeJS.ProcessEnv {
  const env = buildProcessEnv(baseEnv, {}, options);
  return {
    ...env,
    npm_config_cache: npmCacheDir,
    NPM_CONFIG_CACHE: npmCacheDir
  };
}

async function createSkillsCommandEnv(): Promise<NodeJS.ProcessEnv> {
  const npmCacheDir = getSkillsNpmCacheDir();
  await fs.mkdir(npmCacheDir, { recursive: true });
  return buildSkillsCommandEnv(process.env, npmCacheDir);
}

function forwardProcessOutput(
  emit: ((line: string, stream: "stdout" | "stderr") => void) | null,
  chunk: Buffer | string,
  stream: "stdout" | "stderr",
  state: { stdout: string; stderr: string; pendingStdout: string; pendingStderr: string }
): void {
  const text = chunk.toString();
  if (stream === "stdout") {
    state.stdout += text;
    state.pendingStdout += text;
  } else {
    state.stderr += text;
    state.pendingStderr += text;
  }

  if (!emit) {
    return;
  }

  const key = stream === "stdout" ? "pendingStdout" : "pendingStderr";
  const pending = state[key];
  const parts = pending.split(/\r\n?|\n/g);
  state[key] = parts.pop() || "";
  for (const part of parts) {
    const line = stripAnsi(part).trimEnd();
    if (line) {
      emit(line, stream);
    }
  }
}

function flushPendingProcessOutput(
  emit: ((line: string, stream: "stdout" | "stderr") => void) | null,
  state: { pendingStdout: string; pendingStderr: string }
): void {
  if (!emit) {
    return;
  }

  const stdoutLine = stripAnsi(state.pendingStdout).trimEnd();
  if (stdoutLine) {
    emit(stdoutLine, "stdout");
  }
  const stderrLine = stripAnsi(state.pendingStderr).trimEnd();
  if (stderrLine) {
    emit(stderrLine, "stderr");
  }
}

async function runSpawnedSkillsCommand(
  candidate: SkillsCommandCandidate,
  args: string[],
  env: NodeJS.ProcessEnv,
  reporter?: SkillInstallReporter
): Promise<SkillsCommandExecution> {
  const fullArgs = [...candidate.argsPrefix, ...args];
  const command = formatDisplayCommand(candidate.label, args);

  return new Promise((resolve, reject) => {
    let settled = false;
    const outputState = {
      stdout: "",
      stderr: "",
      pendingStdout: "",
      pendingStderr: ""
    };
    const emit = reporter
      ? (line: string, stream: "stdout" | "stderr") => {
          reporter({
            type: "line",
            line,
            stream
          });
        }
      : null;
    const child = shouldUseWindowsCmdWrapper(candidate.executable)
      ? spawn(buildShellCommand(candidate.executable, fullArgs), {
          cwd: process.cwd(),
          env,
          shell: true,
          windowsHide: true
        })
      : spawn(candidate.executable, fullArgs, {
          cwd: process.cwd(),
          env,
          shell: false,
          windowsHide: true
        });

    child.stdout?.on("data", (chunk: Buffer | string) => {
      forwardProcessOutput(emit, chunk, "stdout", outputState);
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      forwardProcessOutput(emit, chunk, "stderr", outputState);
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      flushPendingProcessOutput(emit, outputState);
      if (code === 0) {
        resolve({
          command,
          stdout: outputState.stdout,
          stderr: outputState.stderr
        });
        return;
      }

      const error = new Error(`Command exited with code ${code ?? 1}.`);
      Object.assign(error, {
        code,
        stdout: outputState.stdout,
        stderr: outputState.stderr
      });
      reject(error);
    });
  });
}

async function runSkillsCommand(args: string[]): Promise<SkillsCommandExecution> {
  const commandEnv = await createSkillsCommandEnv();
  let lastError: unknown = null;

  for (const candidate of await getPreferredSkillsCommands()) {
    try {
      const { stdout, stderr } = shouldUseWindowsCmdWrapper(candidate.executable)
        ? await runShellCommand(buildShellCommand(candidate.executable, [...candidate.argsPrefix, ...args]), commandEnv)
        : await execFileAsync(candidate.executable, [...candidate.argsPrefix, ...args], {
            cwd: process.cwd(),
            env: commandEnv,
            timeout: 60_000,
            maxBuffer: 8 * 1024 * 1024,
            windowsHide: true
          });

      return {
        command: formatDisplayCommand(candidate.label, args),
        stdout,
        stderr
      };
    } catch (error: unknown) {
      if (isCommandNotFoundError(error)) {
        lastError = error;
        continue;
      }
      lastError = error;
    }
  }

  if (!lastError) {
    throw new Error("Neither skills, npx, nor npm exec could be found in the app environment.");
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to execute the skills CLI.");
}

async function runStreamedSkillsCommand(
  args: string[],
  reporter: SkillInstallReporter
): Promise<SkillsCommandExecution> {
  const commandEnv = await createSkillsCommandEnv();
  let lastError: unknown = null;

  for (const candidate of await getPreferredSkillsCommands()) {
    const command = formatDisplayCommand(candidate.label, args);

    try {
      reporter({
        type: "start",
        command,
        stream: "system"
      });
      const result = await runSpawnedSkillsCommand(candidate, args, commandEnv, reporter);
      reporter({
        type: "end",
        command,
        stream: "system",
        success: true
      });
      return result;
    } catch (error: unknown) {
      if (isCommandNotFoundError(error)) {
        lastError = error;
        continue;
      }

      const message = error instanceof Error ? error.message : "Unable to execute the skills CLI.";
      const stderr = error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr
        : "";
      if (!stderr.trim()) {
        reporter({
          type: "line",
          line: message,
          stream: "system"
        });
      }
      reporter({
        type: "end",
        command,
        stream: "system",
        success: false
      });
      throw error;
    }
  }

  if (!lastError) {
    const error = new Error("Neither skills, npx, nor npm exec could be found in the app environment.");
    reporter({
      type: "line",
      line: error.message,
      stream: "system"
    });
    reporter({
      type: "end",
      stream: "system",
      success: false
    });
    throw error;
  }

  reporter({
    type: "line",
    line: lastError instanceof Error ? lastError.message : "Unable to execute the skills CLI.",
    stream: "system"
  });
  reporter({
    type: "end",
    stream: "system",
    success: false
  });
  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to execute the skills CLI.");
}

function firstNonEmptyParagraph(value: string): string | null {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    if (!paragraph.startsWith("#")) {
      return paragraph.replace(/\s+/g, " ");
    }
  }

  return null;
}

function isNpmNoiseLine(line: string): boolean {
  const normalized = line.trim().toLowerCase();
  return (
    normalized.startsWith("npm warn ") ||
    normalized.startsWith("npm notice") ||
    normalized.startsWith("npm error")
  );
}

function isSkillsReferenceLine(line: string): boolean {
  return /^[a-z0-9_.-]+\/[a-z0-9_.-]+@.+/i.test(line.trim());
}

function stripAnsi(value: string): string {
  return value
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "");
}

function parseSkillSearchMatches(lines: string[]): AgentSkillSearchMatch[] {
  const matches: AgentSkillSearchMatch[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = stripAnsi(lines[index] || "").trim();
    if (!isSkillsReferenceLine(line)) {
      continue;
    }

    const installsMatch = line.match(/\s+([0-9][0-9.,]*[kKmM]?) installs$/);
    const reference = installsMatch
      ? line.slice(0, installsMatch.index).trim()
      : line;
    const installsLabel = installsMatch?.[1] ? `${installsMatch[1]} installs` : null;
    const nextLine = lines[index + 1]?.trim() || "";
    const url = /^https:\/\/skills\.sh\//i.test(nextLine) ? nextLine : null;

    if (seen.has(reference)) {
      continue;
    }
    seen.add(reference);

    matches.push({
      reference,
      installsLabel,
      url
    });
  }

  return matches;
}

async function readSkillEntry(
  rootPath: string,
  directoryName: string,
  entryFileName: string
): Promise<AgentSkillEntry | null> {
  if (!directoryName || directoryName.startsWith(".")) {
    return null;
  }

  const skillPath = path.join(rootPath, directoryName);
  const skillFilePath = path.join(skillPath, entryFileName);

  try {
    const stat = await fs.stat(skillPath);
    if (!stat.isDirectory()) {
      return null;
    }
    await fs.access(skillFilePath);
  } catch {
    return null;
  }

  let description: string | null = null;
  try {
    const skillFile = await fs.readFile(skillFilePath, "utf8");
    description = firstNonEmptyParagraph(skillFile);
  } catch {
    description = null;
  }

  return {
    id: directoryName,
    name: directoryName,
    description,
    path: skillPath,
    entryFilePath: skillFilePath,
    enabled: true
  };
}

export async function readAgentSkillCatalog(toolId: string): Promise<AgentSkillCatalog> {
  const config = getSkillCatalogConfig(toolId);
  if (!config) {
    return {
      toolId,
      supported: false,
      rootPath: null,
      skills: [],
      sourceLabel: null,
      installHint: null,
      errorMessage: null,
      refreshedAt: nowIso()
    };
  }

  const rootPath = resolveConfiguredRootPath(config.rootDir);

  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    const skills = (
      await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => readSkillEntry(rootPath, entry.name, config.entryFileName))
      )
    )
      .filter((entry): entry is AgentSkillEntry => entry !== null)
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      toolId,
      supported: true,
      rootPath,
      skills,
      sourceLabel: config.sourceLabel,
      installHint: config.installHint,
      errorMessage: null,
      refreshedAt: nowIso()
    };
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "ENOENT") {
      return {
        toolId,
        supported: true,
        rootPath,
        skills: [],
        sourceLabel: config.sourceLabel,
        installHint: config.installHint,
        errorMessage: null,
        refreshedAt: nowIso()
      };
    }

    return {
      toolId,
      supported: true,
      rootPath,
      skills: [],
      sourceLabel: config.sourceLabel,
      installHint: config.installHint,
      errorMessage: error instanceof Error ? error.message : "Unable to read skill catalog.",
      refreshedAt: nowIso()
    };
  }
}

export async function readAgentSkillCatalogs(toolIds: string[]): Promise<AgentSkillCatalog[]> {
  return Promise.all(toolIds.map((toolId) => readAgentSkillCatalog(toolId)));
}

export async function searchAgentSkills(toolId: string, query: string): Promise<AgentSkillSearchResult> {
  const config = getSkillCatalogConfig(toolId);
  if (!config) {
    throw new Error("That CLI does not support global skills.");
  }

  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    throw new Error("Enter a search query.");
  }

  try {
    const { command, stdout, stderr } = await runSkillsCommand(["find", normalizedQuery]);
    const rawOutput = `${stdout}${stderr ? `${stdout ? "\n" : ""}${stderr}` : ""}`.trim();
    const lines = rawOutput
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
    const filteredLines = lines.filter((line) => !isNpmNoiseLine(line));
    const matches = parseSkillSearchMatches(filteredLines);

    return {
      toolId,
      query: normalizedQuery,
      command,
      status: "available",
      lines: filteredLines.length ? filteredLines : ["No skills were returned."],
      rawOutput,
      matches,
      fetchedAt: nowIso()
    };
  } catch (error: unknown) {
    const stdout = error && typeof error === "object" && "stdout" in error && typeof error.stdout === "string"
      ? error.stdout
      : "";
    const stderr = error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
      ? error.stderr
      : "";
    const rawOutput = `${stdout}${stderr ? `${stdout ? "\n" : ""}${stderr}` : ""}`.trim();
    const lines = rawOutput
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
    const filteredLines = lines.filter((line) => !isNpmNoiseLine(line));

    return {
      toolId,
      query: normalizedQuery,
      command: `skills find ${normalizedQuery}`,
      status: "error",
      lines: filteredLines.length ? filteredLines : [error instanceof Error ? error.message : "Unable to search skills."],
      rawOutput,
      matches: [],
      fetchedAt: nowIso()
    };
  }
}

export async function installAgentSkill(
  toolId: string,
  skillReference: string,
  reporter?: SkillInstallReporter
): Promise<AgentSkillCatalog> {
  const config = getSkillCatalogConfig(toolId);
  if (!config) {
    throw new Error("That CLI does not support global skills.");
  }

  const normalizedSkillReference = skillReference.trim();
  if (!normalizedSkillReference) {
    throw new Error("Enter a skill reference to install.");
  }

  if (reporter) {
    await runStreamedSkillsCommand(["add", "--yes", "--global", normalizedSkillReference], reporter);
  } else {
    await runSkillsCommand(["add", "--yes", "--global", normalizedSkillReference]);
  }

  return readAgentSkillCatalog(toolId);
}

export async function removeAgentSkill(toolId: string, skillId: string): Promise<AgentSkillCatalog> {
  const config = getSkillCatalogConfig(toolId);
  if (!config) {
    throw new Error("That CLI does not support global skills.");
  }

  const normalizedSkillId = skillId.trim();
  if (!normalizedSkillId) {
    throw new Error("Choose a skill to remove.");
  }
  if (path.basename(normalizedSkillId) !== normalizedSkillId) {
    throw new Error("The selected skill id is not valid.");
  }

  const rootPath = resolveConfiguredRootPath(config.rootDir);
  const targetPath = path.join(rootPath, normalizedSkillId);
  await fs.rm(targetPath, { recursive: true, force: true });
  return readAgentSkillCatalog(toolId);
}
