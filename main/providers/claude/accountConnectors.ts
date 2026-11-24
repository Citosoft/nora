import type { McpClaudeAIProxyServerConfig, McpServerStatus, Options } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeAccountConnectorDirectory, ClaudeAccountConnectors, ClaudeOpenInput, ClaudeRuntimeOptions } from "@main/types/execution/claude.types";
import { withClaudeControlSession } from "./controlSession";
import { readSettledClaudeMcp } from "./mcp";

/**
 * Turning this off stops the runtime fetching every claude.ai connector, while connectors passed explicitly still connect;
 * the `disableClaudeAiConnectors` setting would block those too.
 */
const NO_ACCOUNT_CONNECTORS_ENV = { ENABLE_CLAUDEAI_MCP_SERVERS: "false" } as const;

function proxyConfigOf(server: McpServerStatus): McpClaudeAIProxyServerConfig | null {
  return (server.source ?? server.scope) === "claudeai" && server.config?.type === "claudeai-proxy" ? server.config : null;
}

export function createClaudeAccountConnectorDirectory(list: (cwd: string) => Promise<readonly McpServerStatus[]>): ClaudeAccountConnectorDirectory {
  let known = new Map<string, McpClaudeAIProxyServerConfig>();
  const remember = (servers: readonly McpServerStatus[]): void => {
    known = new Map(servers.flatMap((server) => { const config = proxyConfigOf(server); return config ? [[server.name, config] as const] : []; }));
  };
  return {
    remember,
    async resolve(cwd, names) {
      if (names.some((name) => !known.has(name))) {
        try { remember(await list(cwd)); }
        catch (error) { console.warn(`Claude account connectors could not be listed: ${error instanceof Error ? error.message : String(error)}`); }
      }
      return Object.fromEntries(names.flatMap((name) => { const config = known.get(name); return config ? [[name, config] as const] : []; }));
    }
  };
}

/** Lists the runtime's MCP servers through a control session, which sends no prompt. */
export function listClaudeMcpStatuses(runtime: ClaudeRuntimeOptions): (cwd: string) => Promise<readonly McpServerStatus[]> {
  return (cwd) => withClaudeControlSession(runtime, cwd, (session) => readSettledClaudeMcp(() => session.mcpServerStatus()));
}

/** How a session reaches claude.ai connectors: all of them by default, or, without account extras, only the ones it was given. */
export function claudeAccountConnectorOptions(input: Pick<ClaudeOpenInput, "accountExtras" | "accountConnectors">): { env: Readonly<Record<string, string>>; mcpServers: SdkMcpServers } {
  return input.accountExtras ? { env: {}, mcpServers: {} } : { env: NO_ACCOUNT_CONNECTORS_ENV, mcpServers: sdkMcpServers(input.accountConnectors) };
}

type SdkMcpServers = NonNullable<Options["mcpServers"]>;
/**
 * The SDK's `mcpServers` type omits claude.ai proxies, yet the SDK forwards every entry verbatim as `--mcp-config` JSON and
 * the runtime connects `claudeai-proxy` entries from it (reporting them back with that type), so only the declared type is widened.
 */
function sdkMcpServers(connectors: ClaudeAccountConnectors): SdkMcpServers {
  return connectors as unknown as SdkMcpServers;
}
