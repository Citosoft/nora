import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { commandLaunch } from "@main/helpers/commandLaunch";
import type { ClaudeLoginMethod, ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import type { ProviderAccountAction, ProviderAccountResult, ProviderLoginMethod } from "@shared/types/provider/account.types";
import { normalizeClaudeAccount, normalizeClaudeConnection } from "./authentication";
import { withClaudeControlSession } from "./controlSession";

/** The sign-ins `claude auth login` supports; the first is the runtime's default. */
const CLAUDE_LOGIN_METHODS: readonly ClaudeLoginMethod[] = [
  { id: "claudeai", label: "Claude subscription", description: "Use a Pro, Max, Team or Enterprise plan.", flag: "--claudeai" },
  { id: "console", label: "Anthropic Console", description: "Use an Anthropic Console account, billed for API usage.", flag: "--console" }
];

export const claudeLoginMethods: readonly ProviderLoginMethod[] = CLAUDE_LOGIN_METHODS.map(({ id, label, description }) => ({ id, label, description }));

/** Resolves a requested sign-in to its CLI flag: no id means the default, an unknown id resolves to nothing. */
export function claudeLoginFlag(methodId: string | undefined): ClaudeLoginMethod["flag"] | null {
  const method = methodId === undefined ? CLAUDE_LOGIN_METHODS[0] : CLAUDE_LOGIN_METHODS.find((entry) => entry.id === methodId);
  return method?.flag ?? null;
}

/**
 * The Agent SDK reports the account but offers no sign-in API, so login delegates to the runtime's own
 * browser flow (`auth login --claudeai|--console`); the client re-reads the account through the SDK until it changes.
 */
export function createClaudeAccount(runtime: ClaudeRuntimeOptions): (action: ProviderAccountAction) => Promise<ProviderAccountResult> {
  return async (action) => {
    if (action.kind === "login") {
      const flag = claudeLoginFlag(action.methodId);
      if (!flag) return { kind: "unavailable", message: "This Claude sign-in option isn't supported. Refresh and pick another." };
      try {
        const launch = commandLaunch(runtime.executablePath, ["auth", "login", flag]);
        const child = spawn(launch.command, launch.args, { cwd: homedir(),
          env: { ...process.env, ...runtime.environment }, stdio: "ignore", detached: false, windowsHide: true,
          windowsVerbatimArguments: launch.windowsVerbatimArguments });
        await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
        return { kind: "login-started" };
      } catch {
        return { kind: "unavailable", message: "Claude Code could not start sign-in. Check the configured runtime, then try again." };
      }
    }
    try {
      const info = await withClaudeControlSession(runtime, homedir(), (session) => session.accountInfo());
      return { kind: "account", account: normalizeClaudeAccount(info), connection: normalizeClaudeConnection(info), loginMethods: [...claudeLoginMethods] };
    } catch {
      return { kind: "unavailable", message: "Claude Code's account could not be read. Check the configured runtime, then refresh." };
    }
  };
}
