import { homedir } from "node:os";
import type { AccountInfo, McpServerStatus } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import type { McpResult, McpServer } from "@shared/types/provider/mcp.types";
import { withClaudeControlSession } from "./controlSession";

const WORKSPACE_ORIGINS = new Set(["project", "local"]);
const LONG_LIVED_TOKEN_SOURCES = new Set(["CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR", "CCR_OAUTH_TOKEN_FILE"]);
const CONNECTORS = "Claude account connectors (added in Claude on the web, desktop or mobile)";

/** Claude reports `source` (newer CLIs) or `scope`; project and local config belong to the workspace, everything else is global. */
export function claudeMcpScope(server: Pick<McpServerStatus, "source" | "scope">): McpServer["scope"] {
  const origin = server.source ?? server.scope;
  if (!origin) return "unknown";
  return WORKSPACE_ORIGINS.has(origin) ? "workspace" : "global";
}

/**
 * Claude Code loads claude.ai connectors only for an interactive claude.ai login; Claude desktop and mobile sign in separately,
 * so connectors visible there are missing whenever the CLI uses other or no credentials.
 */
export function claudeAccountConnectorNotice(account: AccountInfo): string | undefined {
  if (account.apiProvider && account.apiProvider !== "firstParty") return `${CONNECTORS} are not available while Claude Code uses a third-party API provider.`;
  if (account.tokenSource === "claude.ai") return undefined;
  if (account.apiKeySource && account.apiKeySource !== "none") return `${CONNECTORS} are not loaded because an API key takes precedence over a claude.ai login. Remove the API key from Claude Code's environment, then refresh.`;
  if (account.tokenSource && LONG_LIVED_TOKEN_SOURCES.has(account.tokenSource)) return `${CONNECTORS} are not loaded because Claude Code is using a long-lived token. Run \`claude auth login\` to sign in with your claude.ai account, then refresh.`;
  return `${CONNECTORS} are not loaded because Claude Code is not signed in with a claude.ai account on this computer. Run \`claude auth login\`, then refresh.`;
}

export function normalizeClaudeMcp(server: McpServerStatus): McpServer {
  return { name: server.name, status: server.status,
    authStatus: server.status === "needs-auth" ? "needs-auth" : "unknown", canLogin: false, scope: claudeMcpScope(server),
    tools: (server.tools ?? []).map((tool) => ({ name: tool.name, ...(tool.description ? { description: tool.description } : {}) })),
    ...(server.status === "failed" ? { message: "The runtime could not connect. Check the server configuration and sign-in in Claude Code." } : {}) };
}

/** Without a workspace, discovery runs from the home directory so only user, plugin, account and managed servers are relevant. */
export function createClaudeMcpReader(runtime: ClaudeRuntimeOptions): (cwd: string | null) => Promise<McpResult> {
  return async (cwd) => {
    try {
      return await withClaudeControlSession(runtime, cwd ?? homedir(), async (session) => {
        const [servers, account] = await Promise.all([session.mcpServerStatus(), session.accountInfo().catch(() => null)]);
        const notice = account ? claudeAccountConnectorNotice(account) : undefined;
        return { kind: "servers", servers: servers.map(normalizeClaudeMcp), ...(notice ? { notice } : {}) };
      });
    } catch {
      return { kind: "unavailable", message: "Claude MCP discovery is unavailable. Check the configured runtime, its MCP settings and authentication, then refresh." };
    }
  };
}
