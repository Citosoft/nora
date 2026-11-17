import type { AgentCapabilities, McpServer } from "@agentclientprotocol/sdk";
import { mcpAuthorization } from "@main/nora-tools/endpoint";
import type { RunMcpServer } from "@main/types/nora-tools/noraTools.types";

/** The run's MCP servers (Nora's tools and connectors) for ACP agents that advertise HTTP MCP support; others run without them. */
export function acpMcpServers(servers: readonly RunMcpServer[], capabilities: AgentCapabilities | undefined): McpServer[] {
  if (!capabilities?.mcpCapabilities?.http) return [];
  return servers.map((server) => ({ type: "http", name: server.name, url: server.url,
    headers: [{ name: "Authorization", value: mcpAuthorization(server) }] }));
}
