import { mcpAuthorization } from "@main/nora-tools/endpoint";
import type { RunMcpServer } from "@main/types/nora-tools/noraTools.types";

/** Per-thread config overrides that add the run's streamable HTTP MCP servers (Nora's tools and connectors) alongside the user's own. */
export function codexMcpServersConfig(servers: readonly RunMcpServer[]): Record<string, string | number | boolean | Record<string, string>> {
  return Object.fromEntries(servers.flatMap((server) => {
    const prefix = `mcp_servers.${server.name}`;
    return [[`${prefix}.enabled`, true], [`${prefix}.url`, server.url], [`${prefix}.http_headers`, { Authorization: mcpAuthorization(server) }],
      ...(server.toolTimeoutSeconds ? [[`${prefix}.tool_timeout_sec`, server.toolTimeoutSeconds]] : [])];
  }));
}
