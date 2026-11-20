import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ConnectorToolCallResult, ConnectorToolClient, ConnectorToolClientOptions, StoredConnector } from "@main/types/connectors/connectors.types";
import { ConnectorToolError } from "./toolError";
import { toolInputSchemaOf } from "@shared/providers/mcp";

const CALL_TIMEOUT_MS = 60_000;
const isUnauthorized = (error: unknown): boolean => error instanceof StreamableHTTPError && (error.code === 401 || error.code === 403);

/**
 * Nora's own MCP client for calling connector tools, used by apps to load their sources and run their actions without an agent.
 * Credentials come from the same store and refresh as the gateway threads use; one session per connector is kept open and dropped
 * on failure, disable or removal.
 */
export function createConnectorToolClient({ store, credentials, onNeedsAuth, fetch: fetchFn }: ConnectorToolClientOptions): ConnectorToolClient {
  const sessions = new Map<string, Promise<Client>>();

  async function connect(connector: StoredConnector, forceRefresh: boolean): Promise<Client> {
    const headers = await credentials(connector, { forceRefresh });
    if (!headers) { onNeedsAuth(connector.id); throw new ConnectorToolError("needs-auth", `Sign in to ${connector.name} to use it here.`); }
    const client = new Client({ name: "nora-apps", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(connector.url), { requestInit: { headers }, ...(fetchFn ? { fetch: fetchFn } : {}) });
    await client.connect(transport, { signal: AbortSignal.timeout(CALL_TIMEOUT_MS) });
    return client;
  }
  const session = (connector: StoredConnector, forceRefresh = false): Promise<Client> => {
    const existing = sessions.get(connector.id);
    if (existing && !forceRefresh) return existing;
    const pending = connect(connector, forceRefresh);
    sessions.set(connector.id, pending);
    pending.catch(() => { if (sessions.get(connector.id) === pending) sessions.delete(connector.id); });
    return pending;
  };
  const drop = async (id: string): Promise<void> => {
    const pending = sessions.get(id);
    sessions.delete(id);
    if (pending) await pending.then((client) => client.close(), () => undefined).catch(() => undefined);
  };
  const existing = (id: string): StoredConnector => {
    const connector = store.get(id);
    if (!connector) throw new ConnectorToolError("unavailable", "This connector no longer exists.");
    if (!connector.enabled) throw new ConnectorToolError("unavailable", `${connector.name} is turned off in Settings.`);
    return connector;
  };

  /** Runs one request against the connector, retrying once with fresh credentials when an OAuth server rejects the session. */
  async function withSession<T>(connector: StoredConnector, action: (client: Client) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try { return await action(await session(connector, attempt > 0)); }
      catch (error) {
        if (error instanceof ConnectorToolError) throw error;
        await drop(connector.id);
        if (isUnauthorized(error)) {
          if (connector.auth.kind === "oauth" && attempt === 0) continue;
          onNeedsAuth(connector.id);
          throw new ConnectorToolError("needs-auth", `${connector.name} rejected Nora's sign-in. Sign in again in Settings.`);
        }
        if (error instanceof Error && error.name === "TimeoutError") throw new ConnectorToolError("tool-failed", `${connector.name} did not respond in time.`);
        throw new ConnectorToolError("tool-failed", error instanceof Error && error.message ? error.message : `${connector.name} could not complete the call.`);
      }
    }
  }

  return {
    async callTool(connectorId, tool, args) {
      const connector = existing(connectorId);
      const result = await withSession(connector, (client) => client.callTool({ name: tool, arguments: args }, undefined, { signal: AbortSignal.timeout(CALL_TIMEOUT_MS) }));
      return result as ConnectorToolCallResult;
    },
    async listTools(connectorId) {
      const connector = existing(connectorId);
      return withSession(connector, async (client) => {
        const tools: Awaited<ReturnType<ConnectorToolClient["listTools"]>> = [];
        let cursor: string | undefined;
        do {
          const page = await client.listTools(cursor ? { cursor } : {}, { signal: AbortSignal.timeout(CALL_TIMEOUT_MS) });
          tools.push(...page.tools.map((entry) => ({ name: entry.name, ...(entry.description ? { description: entry.description } : {}), inputSchema: toolInputSchemaOf(entry.inputSchema) })));
          cursor = page.nextCursor;
        } while (cursor);
        return tools;
      });
    },
    forget: (id) => drop(id),
    async close() { await Promise.all([...sessions.keys()].map(drop)); }
  };
}
