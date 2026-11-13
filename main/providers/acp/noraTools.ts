import type { AgentCapabilities, McpServer } from "@agentclientprotocol/sdk";
import { NORA_MCP_SERVER_NAME, noraAuthorization } from "@main/nora-tools/endpoint";
import type { NoraToolEndpoint } from "@main/types/nora-tools/noraTools.types";

/** Nora's MCP server for ACP agents that advertise HTTP MCP support; others run without it. */
export function acpNoraServers(endpoint: NoraToolEndpoint | null, capabilities: AgentCapabilities | undefined): McpServer[] {
  if (!endpoint || !capabilities?.mcpCapabilities?.http) return [];
  return [{ type: "http", name: NORA_MCP_SERVER_NAME, url: endpoint.url, headers: [{ name: "Authorization", value: noraAuthorization(endpoint) }] }];
}
