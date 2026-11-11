import { spawn } from "node:child_process";
import { homedir } from "node:os";
import type { ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import type { ProviderAccountAction, ProviderAccountResult } from "@shared/types/provider/account.types";
import { normalizeClaudeAccount } from "./authentication";
import { withClaudeControlSession } from "./controlSession";

/**
 * The Agent SDK reports the account but offers no sign-in API, so login delegates to the runtime's own
 * browser flow (`auth login --claudeai`); the client re-reads the account through the SDK until it changes.
 */
export function createClaudeAccount(runtime: ClaudeRuntimeOptions): (action: ProviderAccountAction) => Promise<ProviderAccountResult> {
  return async (action) => {
    if (action.kind === "login") {
      try {
        const child = spawn(runtime.executablePath, ["auth", "login", "--claudeai"], { cwd: homedir(),
          env: { ...process.env, ...runtime.environment }, stdio: "ignore", detached: false, windowsHide: true,
          shell: process.platform === "win32" });
        await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
        return { kind: "login-started" };
      } catch {
        return { kind: "unavailable", message: "Claude Code could not start sign-in. Check the configured runtime, then try again." };
      }
    }
    try {
      return { kind: "account", account: await withClaudeControlSession(runtime, homedir(), async (session) => normalizeClaudeAccount(await session.accountInfo())) };
    } catch {
      return { kind: "unavailable", message: "Claude Code's account could not be read. Check the configured runtime, then refresh." };
    }
  };
}
