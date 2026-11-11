import type { McpServerTableData, RuntimeMcpEntry } from "@/components/app/types/runtimeMcp.types";
import type { McpServer } from "@shared/types/provider/mcp.types";

const SCOPE_ORDER: Readonly<Record<McpServer["scope"], number>> = { global: 0, workspace: 1, unknown: 2 };

/**
 * Flattens every provider's loaded servers into one table, global servers first, then by provider and name.
 * Account connectors the user never connected are offered, not set up, so they are counted rather than listed.
 */
export function buildMcpServerTable(entries: readonly RuntimeMcpEntry[]): McpServerTableData {
  const discovered = entries.flatMap(({ source, state }) => state.status === "loaded" && state.result.kind === "servers"
    ? state.result.servers.map((server) => ({ server, source })) : []);
  const rows = discovered.filter(({ server }) => server.accountConnector !== "available")
    .sort((a, b) => SCOPE_ORDER[a.server.scope] - SCOPE_ORDER[b.server.scope]
      || a.source.label.localeCompare(b.source.label) || a.server.name.localeCompare(b.server.name));
  return { rows, availableAccountConnectors: discovered.length - rows.length };
}
