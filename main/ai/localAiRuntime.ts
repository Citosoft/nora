import type { LocalAiRuntimeStatus } from "@shared/appTypes";
import { app } from "electron";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { buildProcessEnv } from "../processEnv";
import { findExecutableOnPath } from "../processLookup";

const execFileAsync = promisify(execFile);

const LLAMA_CPP_RELEASE_TAG = "b9351";
const LLAMA_CPP_RELEASE_BASE_URL = `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_RELEASE_TAG}`;

const LOCAL_LLAMA_EXECUTABLE_NAMES = ["llama-cli", "llama.cpp"];

const COMMON_POSIX_LLAMA_PATHS = [
  "/opt/homebrew/bin/llama-cli",
  "/usr/local/bin/llama-cli",
  "/opt/homebrew/bin/llama.cpp",
  "/usr/local/bin/llama.cpp",
  "/usr/bin/llama-cli"
];

export function buildManagedLlamaRuntimeDirectory(userDataPath: string): string {
  return path.join(userDataPath, "ai-runtime", "llama");
}

export function buildManagedLlamaExecutablePath(userDataPath: string): string {
  const executableName = process.platform === "win32" ? "llama-cli.exe" : "llama-cli";
  return path.join(buildManagedLlamaRuntimeDirectory(userDataPath), executableName);
}

export function getManagedLlamaRuntimeDirectory(): string {
  return buildManagedLlamaRuntimeDirectory(app.getPath("userData"));
}

export function getManagedLlamaExecutablePath(): string {
  return buildManagedLlamaExecutablePath(app.getPath("userData"));
}

export async function getLocalAiRuntimeStatus(): Promise<LocalAiRuntimeStatus> {
  const checkedPaths = getLocalLlamaExecutableCandidates();
  for (const candidate of checkedPaths) {
    if (await isExecutableFile(candidate)) {
      if (candidate === getManagedLlamaExecutablePath()) {
        await repairLocalLlamaRuntimeSharedLibraryLinks(path.dirname(candidate));
      }
      return {
        state: "installed",
        executablePath: candidate,
        checkedPaths
      };
    }
  }

  return {
    state: "not-installed",
    executablePath: null,
    checkedPaths
  };
}

export async function getLocalLlamaExecutablePath(): Promise<string | null> {
  return (await getLocalAiRuntimeStatus()).executablePath;
}

export function buildLocalLlamaRuntimeEnv(
  executablePath: string,
  sourceEnv: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv {
  const runtimeDirectory = path.dirname(executablePath);
  const env = buildProcessEnv(sourceEnv);

  if (process.platform === "win32") {
    env.PATH = [runtimeDirectory, env.PATH].filter(Boolean).join(path.delimiter);
    return env;
  }

  if (process.platform === "darwin") {
    env.DYLD_LIBRARY_PATH = [runtimeDirectory, env.DYLD_LIBRARY_PATH].filter(Boolean).join(path.delimiter);
    return env;
  }

  env.LD_LIBRARY_PATH = [runtimeDirectory, env.LD_LIBRARY_PATH].filter(Boolean).join(path.delimiter);
  return env;
}

export async function repairLocalLlamaRuntimeSharedLibraryLinks(runtimeDirectory: string): Promise<void> {
  if (process.platform !== "linux") {
    return;
  }

  const entries = await fsPromises.readdir(runtimeDirectory, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => createLinuxSharedLibrarySonameLink(runtimeDirectory, entry.name))
  );
}

export async function installLocalAiRuntime(): Promise<LocalAiRuntimeStatus> {
  const existing = await getLocalAiRuntimeStatus();
  if (existing.state === "installed") {
    return existing;
  }

  if (process.platform === "win32") {
    await installWindowsManagedLlamaRuntime();
  } else if (process.platform === "darwin") {
    await installMacLlamaRuntime();
  } else if (process.platform === "linux") {
    await installLinuxLlamaRuntime();
  } else {
    throw new Error("Local models are not supported on this platform.");
  }

  const nextStatus = await getLocalAiRuntimeStatus();
  if (nextStatus.state !== "installed") {
    throw new Error("llama.cpp installation finished but Nora could not find llama-cli.");
  }

  return nextStatus;
}

function getLocalLlamaExecutableCandidates(): string[] {
  const managedExecutablePath = getManagedLlamaExecutablePath();
  const pathEntries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const pathCandidates = pathEntries.flatMap((entry) =>
    LOCAL_LLAMA_EXECUTABLE_NAMES.map((name) => path.join(entry, getPlatformExecutableName(name)))
  );
  const commonCandidates = process.platform === "win32" ? [] : COMMON_POSIX_LLAMA_PATHS;

  return Array.from(new Set([managedExecutablePath, ...pathCandidates, ...commonCandidates]));
}

function getPlatformExecutableName(name: string): string {
  return process.platform === "win32" ? `${name}.exe` : name;
}

async function isExecutableFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fsPromises.stat(filePath);
    if (!stats.isFile()) {
      return false;
    }
    if (process.platform === "win32") {
      return true;
    }
    await fsPromises.access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function getManagedLlamaReleaseAssetName(): string {
  if (process.platform === "win32") {
    return process.arch === "arm64" ? "llama-b9351-bin-win-cpu-arm64.zip" : "llama-b9351-bin-win-cpu-x64.zip";
  }
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "llama-b9351-bin-macos-arm64.tar.gz" : "llama-b9351-bin-macos-x64.tar.gz";
  }
  return process.arch === "arm64" ? "llama-b9351-bin-ubuntu-arm64.tar.gz" : "llama-b9351-bin-ubuntu-x64.tar.gz";
}

async function installWindowsManagedLlamaRuntime(): Promise<void> {
  await installManagedLlamaRuntimeFromArchive(getManagedLlamaReleaseAssetName(), extractZipArchive);
}

async function installLinuxLlamaRuntime(): Promise<void> {
  const brewPath = await findExecutableOnPath(["brew"], false);
  if (brewPath) {
    await execFileAsync(brewPath, ["install", "llama.cpp"], {
      maxBuffer: 1024 * 1024 * 8,
      env: buildProcessEnv(process.env)
    });
    return;
  }

  await installManagedLlamaRuntimeFromArchive(getManagedLlamaReleaseAssetName(), extractTarGzArchive);
}

async function installMacLlamaRuntime(): Promise<void> {
  const brewPath = await findExecutableOnPath(["brew"], false);
  if (!brewPath) {
    throw new Error("Install Homebrew from https://brew.sh, then try again.");
  }

  await execFileAsync(brewPath, ["install", "llama.cpp"], {
    maxBuffer: 1024 * 1024 * 8,
    env: buildProcessEnv(process.env)
  });
}

async function installManagedLlamaRuntimeFromArchive(
  assetName: string,
  extractArchive: (archivePath: string, destinationPath: string) => Promise<void>
): Promise<void> {
  const downloadUrl = `${LLAMA_CPP_RELEASE_BASE_URL}/${assetName}`;
  const runtimeDirectory = getManagedLlamaRuntimeDirectory();
  const tempDirectory = await fsPromises.mkdtemp(path.join(os.tmpdir(), "nora-llama-runtime-"));
  const archivePath = path.join(tempDirectory, assetName);

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Unable to download llama.cpp runtime (${response.status}).`);
    }

    const file = await fsPromises.open(archivePath, "w");
    try {
      const reader = response.body.getReader();
      while (true) {
        const next = await reader.read();
        if (next.done) {
          break;
        }
        await file.write(Buffer.from(next.value));
      }
    } finally {
      await file.close();
    }

    const extractDirectory = path.join(tempDirectory, "extracted");
    await extractArchive(archivePath, extractDirectory);
    const sourceDirectory = await findLlamaRuntimeSourceDirectory(extractDirectory);
    await fsPromises.rm(runtimeDirectory, { recursive: true, force: true });
    await fsPromises.mkdir(runtimeDirectory, { recursive: true });
    await copyRuntimeDirectoryContents(sourceDirectory, runtimeDirectory);
    await ensurePosixExecutable(runtimeDirectory);
    await repairLocalLlamaRuntimeSharedLibraryLinks(runtimeDirectory);
  } finally {
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
  }
}

async function extractZipArchive(archivePath: string, destinationPath: string): Promise<void> {
  await fsPromises.mkdir(destinationPath, { recursive: true });
  if (process.platform === "win32") {
    await execFileAsync("tar", ["-xf", archivePath, "-C", destinationPath], {
      maxBuffer: 1024 * 1024 * 8
    });
    return;
  }

  await execFileAsync("unzip", ["-oq", archivePath, "-d", destinationPath], {
    maxBuffer: 1024 * 1024 * 8
  });
}

async function extractTarGzArchive(archivePath: string, destinationPath: string): Promise<void> {
  await fsPromises.mkdir(destinationPath, { recursive: true });
  await execFileAsync("tar", ["-xzf", archivePath, "-C", destinationPath], {
    maxBuffer: 1024 * 1024 * 8
  });
}

async function findLlamaRuntimeSourceDirectory(rootDirectory: string): Promise<string> {
  const managedExecutableName = path.basename(getManagedLlamaExecutablePath());
  const queue = [rootDirectory];

  while (queue.length > 0) {
    const currentDirectory = queue.shift();
    if (!currentDirectory) {
      continue;
    }

    const entries = await fsPromises.readdir(currentDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === managedExecutableName.toLowerCase()) {
        return currentDirectory;
      }
      if (entry.isDirectory()) {
        queue.push(entryPath);
      }
    }
  }

  throw new Error("Downloaded llama.cpp runtime did not include llama-cli.");
}

async function copyRuntimeDirectoryContents(sourceDirectory: string, destinationDirectory: string): Promise<void> {
  const entries = await fsPromises.readdir(sourceDirectory, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const destinationPath = path.join(destinationDirectory, entry.name);
    if (entry.isDirectory()) {
      await fsPromises.cp(sourcePath, destinationPath, { recursive: true });
      continue;
    }
    if (entry.isFile()) {
      await fsPromises.copyFile(sourcePath, destinationPath);
      continue;
    }
    if (entry.isSymbolicLink()) {
      const linkTarget = await fsPromises.readlink(sourcePath);
      await fsPromises.symlink(linkTarget, destinationPath);
    }
  }
}

async function createLinuxSharedLibrarySonameLink(runtimeDirectory: string, fileName: string): Promise<void> {
  const sonameMatch = /^(lib.+\.so\.\d+)\.\d+(?:\.\d+)*$/.exec(fileName);
  if (!sonameMatch) {
    return;
  }

  const linkName = sonameMatch[1];
  const linkPath = path.join(runtimeDirectory, linkName);
  try {
    await fsPromises.lstat(linkPath);
    return;
  } catch {
    // Missing SONAME links are expected for older managed runtime copies.
  }

  try {
    await fsPromises.symlink(fileName, linkPath);
  } catch {
    await fsPromises.copyFile(path.join(runtimeDirectory, fileName), linkPath);
  }
}

async function ensurePosixExecutable(runtimeDirectory: string): Promise<void> {
  if (process.platform === "win32") {
    return;
  }

  const executablePath = path.join(runtimeDirectory, "llama-cli");
  try {
    await fsPromises.chmod(executablePath, 0o755);
  } catch {
    // Ignore chmod failures; runtime detection will surface missing executables.
  }
}
