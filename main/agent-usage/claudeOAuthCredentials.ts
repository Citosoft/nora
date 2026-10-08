import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ClaudeOAuthCredentials } from "../types/agent-usage/claudeUsageLimits.types";

const execFileAsync = promisify(execFile);

/** Claude Code stores subscription OAuth tokens here on macOS; other platforms use `.credentials.json`. */
const CLAUDE_KEYCHAIN_SERVICE = "Claude Code-credentials";

export const parseClaudeOAuthCredentials = (raw: string): ClaudeOAuthCredentials | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    const oauth = parsed && typeof parsed === "object" && "claudeAiOauth" in parsed ? parsed.claudeAiOauth : null;
    if (!oauth || typeof oauth !== "object") {
      return null;
    }
    const accessToken = "accessToken" in oauth && typeof oauth.accessToken === "string" ? oauth.accessToken.trim() : "";
    if (!accessToken) {
      return null;
    }
    return {
      accessToken,
      expiresAtMs: "expiresAt" in oauth && typeof oauth.expiresAt === "number" ? oauth.expiresAt : null,
      subscriptionType:
        "subscriptionType" in oauth && typeof oauth.subscriptionType === "string" ? oauth.subscriptionType : null
    };
  } catch {
    return null;
  }
};

const readCredentialsFile = async (configDir: string): Promise<ClaudeOAuthCredentials | null> => {
  const raw = await fs.readFile(path.join(configDir, ".credentials.json"), "utf8").catch(() => null);
  return raw ? parseClaudeOAuthCredentials(raw) : null;
};

const readMacKeychainCredentials = async (): Promise<ClaudeOAuthCredentials | null> => {
  if (process.platform !== "darwin") {
    return null;
  }
  const { stdout } = await execFileAsync(
    "security",
    ["find-generic-password", "-s", CLAUDE_KEYCHAIN_SERVICE, "-w"],
    { timeout: 30_000, maxBuffer: 1024 * 64 }
  ).catch(() => ({ stdout: "" }));
  return stdout.trim() ? parseClaudeOAuthCredentials(stdout.trim()) : null;
};

/**
 * Reads Claude Code's own subscription credentials without refreshing them: refreshing would rotate the
 * refresh token underneath Claude Code, so an expired token is reported instead.
 */
export const readClaudeOAuthCredentials = async (configDir: string): Promise<ClaudeOAuthCredentials | null> =>
  (await readCredentialsFile(configDir)) ?? (await readMacKeychainCredentials());
