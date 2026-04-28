import type { DetectedUserIdentity } from "@shared/types/userIdentity.types";
import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function isWindows(): boolean {
  return process.platform === "win32";
}

function normalizeDisplayName(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

async function readGitConfig(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      windowsHide: true,
      maxBuffer: 64 * 1024
    });
    return normalizeDisplayName(stdout);
  } catch {
    return null;
  }
}

async function detectGitName(): Promise<DetectedUserIdentity | null> {
  const localName = await readGitConfig(["config", "--get", "user.name"]);
  if (localName) {
    return {
      displayName: localName,
      source: "git-local"
    };
  }

  const globalName = await readGitConfig(["config", "--global", "--get", "user.name"]);
  if (globalName) {
    return {
      displayName: globalName,
      source: "git-global"
    };
  }

  return null;
}

async function detectWindowsDisplayName(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoLogo",
      "-NoProfile",
      "-Command",
      "[System.DirectoryServices.AccountManagement.UserPrincipal]::Current.DisplayName"
    ], {
      windowsHide: true,
      maxBuffer: 64 * 1024
    });
    return normalizeDisplayName(stdout);
  } catch {
    return null;
  }
}

function detectOsUsername(): string | null {
  try {
    return normalizeDisplayName(os.userInfo().username);
  } catch {
    return null;
  }
}

export async function detectUserIdentity(): Promise<DetectedUserIdentity> {
  const gitIdentity = await detectGitName();
  if (gitIdentity) {
    return gitIdentity;
  }

  if (isWindows()) {
    const windowsDisplayName = await detectWindowsDisplayName();
    if (windowsDisplayName) {
      return {
        displayName: windowsDisplayName,
        source: "os-display"
      };
    }
  }

  const username = detectOsUsername();
  if (username) {
    return {
      displayName: username,
      source: "os-username"
    };
  }

  return {
    displayName: null,
    source: "unknown"
  };
}
