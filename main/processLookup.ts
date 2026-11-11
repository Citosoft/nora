import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { buildProcessEnv } from "./processEnv";
import type { AgentExecutablePathCandidate } from "./types/internal.types";

const execFileAsync = promisify(execFile);
let resolvedWindowsPathPromise: Promise<string | null> | null = null;

export async function findExistingPath(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

async function getRefreshedWindowsPath(): Promise<string | null> {
  if (process.platform !== "win32") {
    return null;
  }

  if (!resolvedWindowsPathPromise) {
    resolvedWindowsPathPromise = (async () => {
      try {
        const { stdout } = await execFileAsync(
          "powershell.exe",
          [
            "-NoProfile",
            "-Command",
            "[Environment]::GetEnvironmentVariable('Path','Machine');" +
              "Write-Output '---NORA-PATH-SPLIT---';" +
              "[Environment]::GetEnvironmentVariable('Path','User')"
          ],
          {
            windowsHide: true,
            maxBuffer: 1024 * 1024
          }
        );

        const [machinePath = "", userPath = ""] = stdout
          .split("---NORA-PATH-SPLIT---")
          .map((value) => value.replace(/\r?\n/g, "").trim());
        const merged = [machinePath, userPath].filter(Boolean).join(";");
        return merged || null;
      } catch {
        return null;
      }
    })();
  }

  return resolvedWindowsPathPromise;
}

export async function findExecutableOnPath(candidates: string[], isWindows: boolean): Promise<string | null> {
  const locator = isWindows ? "where.exe" : "which";
  const refreshedWindowsPath = isWindows ? await getRefreshedWindowsPath() : null;
  const env = buildProcessEnv(
    process.env,
    refreshedWindowsPath ? { PATH: refreshedWindowsPath } : {}
  );
  for (const candidate of candidates) {
    try {
      const { stdout } = await execFileAsync(locator, [candidate], {
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        env
      });
      const match = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (match) {
        return match;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/** Expands an agent's known install locations for this platform (home and Windows profile variables). */
export function resolveExecutablePathCandidates(candidates: AgentExecutablePathCandidate[]): string[] {
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
