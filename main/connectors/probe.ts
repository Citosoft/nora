import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { resolveMcpServerLogo } from "@main/providers/mcpLogo";
import type { ConnectorCredentials, ConnectorProbe, StoredConnector } from "@main/types/connectors/connectors.types";
import type { McpServer } from "@shared/types/provider/mcp.types";
import { toolInputSchemaOf } from "@shared/providers/mcp";

const PROBE_TIMEOUT_MS = 20_000;
const MAX_TOOL_PAGES = 20;
const isUnauthorized = (error: unknown): boolean => error instanceof StreamableHTTPError && (error.code === 401 || error.code === 403);

/** Converts a connection failure into a message the user can act on, without exposing raw transport details. */
function failureMessage(connector: StoredConnector, error: unknown): string {
  if (error instanceof StreamableHTTPError) {
    if (error.code === 404) return "The server did not answer at this URL. Check that it is the server's MCP endpoint (often ending in /mcp).";
    if (error.code === 405) return "This server does not support Streamable HTTP, which Nora connectors require.";
    if (isUnauthorized(error) && connector.auth.kind === "header") return `The server rejected the ${connector.auth.name} header. Check its value, then remove and add the connector again.`;
  }
  if (error instanceof Error && error.name === "TimeoutError") return "The server did not respond in time. Refresh to try again.";
  return "Nora could not connect to this server. Check the URL and that the server is reachable, then refresh.";
}

async function listTools(connector: StoredConnector, headers: Record<string, string>, fetchFn: typeof fetch | undefined): Promise<Pick<ConnectorProbe, "tools" | "logo">> {
  const client = new Client({ name: "nora", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(connector.url), { requestInit: { headers },
    ...(fetchFn ? { fetch: fetchFn } : {}) });
  const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
  try {
    await client.connect(transport, { signal });
    const tools: McpServer["tools"] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_TOOL_PAGES; page += 1) {
      const result = await client.listTools(cursor ? { cursor } : {}, { signal });
      tools.push(...result.tools.map((tool) => ({ name: tool.name, ...(tool.description ? { description: tool.description } : {}), inputSchema: toolInputSchemaOf(tool.inputSchema) })));
      cursor = result.nextCursor;
      if (!cursor) break;
    }
    const logo = resolveMcpServerLogo({ serverInfo: client.getServerVersion(), endpointUrl: connector.url });
    return { tools, ...(logo ? { logo } : {}) };
  } finally {
    await client.close().catch(() => undefined);
  }
}

/**
 * Connects to a connector directly (not through the gateway) to learn its status and tools. An OAuth connector the server rejects
 * gets one refresh before it is reported as needing a sign-in.
 */
export async function probeConnector(connector: StoredConnector, credentials: ConnectorCredentials, fetchFn?: typeof fetch): Promise<ConnectorProbe> {
  const needsAuth: ConnectorProbe = { status: "needs-auth", tools: [], message: "Sign in to let threads use this connector." };
  let headers = await credentials(connector, { forceRefresh: false });
  if (!headers) return needsAuth;
  for (let attempt = 0; ; attempt += 1) {
    try { return { status: "connected", ...await listTools(connector, headers, fetchFn) }; }
    catch (error) {
      if (connector.auth.kind === "oauth" && isUnauthorized(error)) {
        if (attempt > 0) return needsAuth;
        headers = await credentials(connector, { forceRefresh: true });
        if (!headers) return needsAuth;
        continue;
      }
      return { status: "failed", tools: [], message: failureMessage(connector, error) };
    }
  }
}
