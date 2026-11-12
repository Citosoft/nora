import { spawn } from "node:child_process";
import { homedir } from "node:os";
import type { AccountInfo, McpServerStatus } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeMcpLoginRunner, ClaudeRuntimeOptions, McpSettleOptions } from "@main/types/execution/claude.types";
import type { McpAction, McpResult, McpServer } from "@shared/types/provider/mcp.types";
import { resolveMcpServerLogo } from "@main/providers/mcpLogo";
import { claudeLogin } from "./authentication";
import { withClaudeControlSession } from "./controlSession";

const WORKSPACE_ORIGINS = new Set(["project", "local"]);
// Connectors typically settle within ~3s; the budget stays inside the control session's 10s discovery timeout.
const MCP_SETTLE_BUDGET_MS = 7_000;
const MCP_SETTLE_INTERVAL_MS = 500;
const defaultSleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
const CONNECTORS = "Claude account connectors (added in Claude on the web, desktop or mobile)";
// Browser OAuth waits on the user; give up after this so an abandoned sign-in does not leave the runtime running.
const MCP_LOGIN_TIMEOUT_MS = 5 * 60_000;
// Windows needs a shell to run the runtime's command shim, so only names that cannot carry shell syntax reach it.
const SHELL_SAFE_SERVER_NAME = /^[\w .:@-]+$/;

/** Claude reports `source` (newer CLIs) or `scope`; project and local config belong to the workspace, everything else is global. */
export function claudeMcpScope(server: Pick<McpServerStatus, "source" | "scope">): McpServer["scope"] {
  const origin = server.source ?? server.scope;
  if (!origin) return "unknown";
  return WORKSPACE_ORIGINS.has(origin) ? "workspace" : "global";
}

/**
 * Claude Code loads claude.ai connectors only for a claude.ai login; Claude desktop and mobile sign in separately,
 * so connectors visible there are missing whenever the CLI uses other or no credentials.
 */
export function claudeAccountConnectorNotice(account: AccountInfo): string | undefined {
  switch (claudeLogin(account)) {
    case "claude.ai":
    case "unknown": return undefined;
    case "third-party": return `${CONNECTORS} are not available while Claude Code uses a third-party API provider.`;
    case "api-key": return `${CONNECTORS} are not loaded because an API key takes precedence over a claude.ai login. Remove the API key from Claude Code's environment, then refresh.`;
    case "token": return `${CONNECTORS} are not loaded because Claude Code is using a long-lived token. Sign in to Claude in Providers settings, then refresh.`;
    case "none": return `${CONNECTORS} are not loaded because Claude Code is not signed in with a claude.ai account. Sign in to Claude in Providers settings, then refresh.`;
  }
}

/**
 * The runtime connects servers in the background after it starts, so an immediate read reports most as pending.
 * Re-read until none are pending or the budget runs out; discovery then closes the session, so anything still
 * pending will not finish and must not be presented as connecting.
 */
export async function settleClaudeMcp(read: () => Promise<McpServerStatus[]>, options: McpSettleOptions = {}): Promise<McpServer[]> {
  const { budgetMs = MCP_SETTLE_BUDGET_MS, intervalMs = MCP_SETTLE_INTERVAL_MS, sleep = defaultSleep, now = Date.now } = options;
  const deadline = now() + budgetMs;
  let servers = await read();
  while (servers.some((server) => server.status === "pending") && now() + intervalMs <= deadline) {
    await sleep(intervalMs);
    servers = await read();
  }
  return servers.map((server) => server.status === "pending"
    ? { ...normalizeClaudeMcp(server), status: "unknown", message: `Claude Code had not finished connecting to this server after ${Math.round(budgetMs / 1000)} seconds. Refresh to check again.` }
    : normalizeClaudeMcp(server));
}

export function normalizeClaudeMcp(server: McpServerStatus): McpServer {
  // The runtime lists every claude.ai connector the organization offers; ones the user never connected report needs-auth.
  const isAccountConnector = (server.source ?? server.scope) === "claudeai";
  // The SDK types `serverInfo` narrowly, but the runtime passes through MCP icons and website, which the resolver validates.
  const logo = resolveMcpServerLogo({ serverInfo: server.serverInfo,
    endpointUrl: server.config && "url" in server.config ? server.config.url : null });
  // `claude mcp login` covers OAuth for remote (HTTP/SSE) servers and claude.ai connectors, not local stdio servers.
  const canLogin = server.status === "needs-auth" && (isAccountConnector || (!!server.config && "url" in server.config));
  return { name: server.name, status: server.status,
    authStatus: server.status === "needs-auth" ? "needs-auth" : "unknown", canLogin, scope: claudeMcpScope(server),
    ...(isAccountConnector ? { accountConnector: server.status === "needs-auth" ? "available" : "connected" } : {}),
    ...(logo ? { logo } : {}),
    tools: (server.tools ?? []).map((tool) => ({ name: tool.name, ...(tool.description ? { description: tool.description } : {}) })),
    ...(server.status === "failed" ? { message: "The runtime could not connect. Check the server configuration and sign-in in Claude Code." }
      : server.status === "needs-auth" && !canLogin ? { message: "This server's sign-in is not OAuth-based. Configure its credentials in Claude Code, then refresh." } : {}) };
}

/**
 * The Agent SDK exposes no MCP sign-in, so login delegates to the runtime's own `mcp login` browser flow and waits for it,
 * then re-reads the servers so the caller sees the new status. Runs in the workspace so project-scoped servers resolve.
 */
export function createClaudeMcpLoginRunner(runtime: ClaudeRuntimeOptions): ClaudeMcpLoginRunner {
  return (cwd, serverName) => new Promise<boolean>((resolve) => {
    const shell = process.platform === "win32";
    if (shell && !SHELL_SAFE_SERVER_NAME.test(serverName)) { resolve(false); return; }
    const child = spawn(runtime.executablePath, ["mcp", "login", serverName], { cwd,
      env: { ...process.env, ...runtime.environment }, stdio: "ignore", windowsHide: true, shell });
    const timer = setTimeout(() => child.kill(), MCP_LOGIN_TIMEOUT_MS);
    const finish = (completed: boolean) => { clearTimeout(timer); resolve(completed); };
    child.once("error", () => finish(false));
    child.once("exit", (code) => finish(code === 0));
  });
}

/** Without a workspace, discovery runs from the home directory so only user, plugin, account and managed servers are relevant. */
export function createClaudeMcp(runtime: ClaudeRuntimeOptions, runLogin: ClaudeMcpLoginRunner = createClaudeMcpLoginRunner(runtime)): (cwd: string | null, action: McpAction) => Promise<McpResult> {
  const read = async (directory: string): Promise<McpResult> => {
    try {
      return await withClaudeControlSession(runtime, directory, async (session) => {
        const [servers, account] = await Promise.all([settleClaudeMcp(() => session.mcpServerStatus()), session.accountInfo().catch(() => null)]);
        const notice = account ? claudeAccountConnectorNotice(account) : undefined;
        return { kind: "servers", servers, ...(notice ? { notice } : {}) };
      });
    } catch {
      return { kind: "unavailable", message: "Claude MCP discovery is unavailable. Check the configured runtime, its MCP settings and authentication, then refresh." };
    }
  };
  return async (cwd, action) => {
    const directory = cwd ?? homedir();
    if (action.kind === "login" && !await runLogin(directory, action.serverName)) {
      return { kind: "unavailable", message: `Sign-in to ${action.serverName} did not complete. Try again, or sign in from Claude Code with /mcp.` };
    }
    return read(directory);
  };
}
