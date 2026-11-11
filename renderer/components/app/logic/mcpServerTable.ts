import type { DiscoveredMcpServer, RuntimeMcpEntry } from "@/components/app/types/runtimeMcp.types";
import type { McpServer } from "@shared/types/provider/mcp.types";

const SCOPE_ORDER: Readonly<Record<McpServer["scope"], number>> = { global: 0, workspace: 1, unknown: 2 };

/** Flattens every provider's loaded servers into one table, global servers first, then by provider and name. */
export function listMcpServerRows(entries: readonly RuntimeMcpEntry[]): DiscoveredMcpServer[] {
  return entries.flatMap(({ source, state }) => state.status === "loaded" && state.result.kind === "servers"
    ? state.result.servers.map((server) => ({ server, source })) : [])
    .sort((a, b) => SCOPE_ORDER[a.server.scope] - SCOPE_ORDER[b.server.scope]
      || a.source.label.localeCompare(b.source.label) || a.server.name.localeCompare(b.server.name));
}
