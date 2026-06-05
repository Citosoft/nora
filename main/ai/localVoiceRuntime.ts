import type { LocalVoiceRuntimeStatus } from "@shared/appTypes";
import { app } from "electron";
import { execFile, spawn } from "node:child_process";
import { constants } from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { buildProcessEnv } from "../processEnv";
import { findExecutableOnPath } from "../processLookup";

const execFileAsync = promisify(execFile);

const WHISPER_CPP_RELEASE_TAG = "v1.8.6";
const WHISPER_CPP_RELEASE_BASE_URL = `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_CPP_RELEASE_TAG}`;

const LOCAL_WHISPER_EXECUTABLE_NAMES = ["whisper-cli", "whisper-cpp", "whisper.cpp"];

const COMMON_POSIX_WHISPER_PATHS = [
  "/opt/homebrew/bin/whisper-cli",
  "/usr/local/bin/whisper-cli",
  "/opt/homebrew/bin/whisper-cpp",
  "/usr/local/bin/whisper-cpp",
  "/usr/bin/whisper-cli",
  "/usr/bin/whisper.cpp"
];

export function buildManagedWhisperRuntimeDirectory(userDataPath: string): string {
  return path.join(userDataPath, "voice-runtime", "whisper");
}

export function buildManagedWhisperExecutablePath(userDataPath: string): string {
  const executableName = process.platform === "win32" ? "whisper-cli.exe" : "whisper-cli";
  return path.join(buildManagedWhisperRuntimeDirectory(userDataPath), executableName);
}

export function getManagedWhisperRuntimeDirectory(): string {
  return buildManagedWhisperRuntimeDirectory(app.getPath("userData"));
}

export function getManagedWhisperExecutablePath(): string {
  return buildManagedWhisperExecutablePath(app.getPath("userData"));
}

export async function getLocalVoiceRuntimeStatus(): Promise<LocalVoiceRuntimeStatus> {
  const checkedPaths = getLocalWhisperExecutableCandidates();
  for (const candidate of checkedPaths) {
    if (await isExecutableFile(candidate)) {
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

export async function getLocalWhisperExecutablePath(): Promise<string | null> {
  return (await getLocalVoiceRuntimeStatus()).executablePath;
}

export async function installLocalVoiceRuntime(): Promise<LocalVoiceRuntimeStatus> {
  const existing = await getLocalVoiceRuntimeStatus();
  if (existing.state === "installed") {
    return existing;
  }

  if (process.platform === "win32") {
    await installWindowsManagedWhisperRuntime();
  } else if (process.platform === "darwin") {
    await installMacWhisperRuntime();
  } else if (process.platform === "linux") {
    await installLinuxWhisperRuntime();
  } else {
    throw new Error("Local Whisper is not supported on this platform.");
  }

  const nextStatus = await getLocalVoiceRuntimeStatus();
  if (nextStatus.state !== "installed") {
    throw new Error("Whisper runtime installation finished but Nora could not find whisper-cli.");
  }

  return nextStatus;
}

function getLocalWhisperExecutableCandidates(): string[] {
  const managedExecutablePath = getManagedWhisperExecutablePath();
  const pathEntries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const pathCandidates = pathEntries.flatMap((entry) =>
    LOCAL_WHISPER_EXECUTABLE_NAMES.map((name) => path.join(entry, getPlatformExecutableName(name)))
  );
  const commonCandidates = process.platform === "win32"
    ? []
    : COMMON_POSIX_WHISPER_PATHS;

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

async function installWindowsManagedWhisperRuntime(): Promise<void> {
  const assetName = process.arch === "ia32" ? "whisper-bin-Win32.zip" : "whisper-bin-x64.zip";
  const downloadUrl = `${WHISPER_CPP_RELEASE_BASE_URL}/${assetName}`;
  const runtimeDirectory = getManagedWhisperRuntimeDirectory();
  const tempDirectory = await fsPromises.mkdtemp(path.join(os.tmpdir(), "nora-whisper-runtime-"));
  const archivePath = path.join(tempDirectory, assetName);

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Unable to download whisper.cpp runtime (${response.status}).`);
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
    await extractZipArchive(archivePath, extractDirectory);
    const sourceDirectory = await findWhisperRuntimeSourceDirectory(extractDirectory);
    await fsPromises.rm(runtimeDirectory, { recursive: true, force: true });
    await fsPromises.mkdir(runtimeDirectory, { recursive: true });
    await copyRuntimeDirectoryContents(sourceDirectory, runtimeDirectory);
    await ensurePosixExecutable(runtimeDirectory);
  } finally {
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
  }
}

async function installMacWhisperRuntime(): Promise<void> {
  const brewPath = await findExecutableOnPath(["brew"], false);
  if (!brewPath) {
    throw new Error("Install Homebrew from https://brew.sh, then try again.");
  }

  await execFileAsync(brewPath, ["install", "whisper-cpp"], {
    maxBuffer: 1024 * 1024 * 8,
    env: buildProcessEnv(process.env)
  });
}

async function installLinuxWhisperRuntime(): Promise<void> {
  const brewPath = await findExecutableOnPath(["brew"], false);
  if (brewPath) {
    await execFileAsync(brewPath, ["install", "whisper-cpp"], {
      maxBuffer: 1024 * 1024 * 8,
      env: buildProcessEnv(process.env)
    });
    return;
  }

  const pkexecPath = await findExecutableOnPath(["pkexec"], false);
  const aptGetPath = await findExecutableOnPath(["apt-get"], false);
  if (!pkexecPath || !aptGetPath) {
    throw new Error("Install whisper.cpp with your package manager, for example `sudo apt-get install whisper.cpp`.");
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      pkexecPath,
      ["/bin/sh", "-lc", `apt-get update && DEBIAN_FRONTEND=noninteractive ${aptGetPath} install -y whisper.cpp`],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: buildProcessEnv(process.env)
      }
    );

    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `Whisper runtime installation failed with exit code ${code ?? 1}.`));
    });
  });
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

async function findWhisperRuntimeSourceDirectory(rootDirectory: string): Promise<string> {
  const managedExecutableName = path.basename(getManagedWhisperExecutablePath());
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

  throw new Error("Downloaded whisper.cpp runtime did not include whisper-cli.");
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
    }
  }
}

async function ensurePosixExecutable(runtimeDirectory: string): Promise<void> {
  if (process.platform === "win32") {
    return;
  }

  const executablePath = path.join(runtimeDirectory, "whisper-cli");
  try {
    await fsPromises.chmod(executablePath, 0o755);
  } catch {
    // Ignore chmod failures; runtime detection will surface missing executables.
  }
}
